const express = require('express');
const { randomBytes, randomUUID } = require('crypto');
const pool = require('./db');

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I)
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Janela do gráfico: hoje e os 13 dias anteriores, em UTC (14 barras). A tabela clicks usa o apelido "c".
const LAST_14_DAYS = `c.clicked_at >= ((date_trunc('day', now() AT TIME ZONE 'UTC') - interval '13 days') AT TIME ZONE 'UTC')`;
const PER_DAY = `to_char(c.clicked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::int AS clicks`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function generateCode(length = 6) {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

// Devolve a URL normalizada (host em minúsculas, "/" final em endereços sem caminho etc.) ou null se for inválida.
// Normalizar faz "https://globo.com" e "https://GLOBO.com/" contarem como o mesmo link.
function normalizeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href.length <= 2048 ? parsed.href : null;
  } catch {
    return null;
  }
}

// Endereço público usado nos links curtos: BASE_URL, ou o endereço pelo qual o site foi acessado
function baseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function readCookie(req, name) {
  for (const part of (req.get('cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Identifica o visitante por um cookie anônimo (UUID aleatório), sem cadastro.
// Só vale para /api: quem apenas clica num link curto não recebe cookie.
function visitor(req, res, next) {
  let id = readCookie(req, 'visitor_id');
  if (!UUID_PATTERN.test(id || '')) {
    id = randomUUID();
    res.cookie('visitor_id', id, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: ONE_YEAR_MS });
  }
  req.visitorId = id;
  next();
}

// Express 4 não captura erros de funções async, então repassamos para o middleware de erro
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const app = express();
app.set('trust proxy', 1); // atrás do nginx: usa X-Forwarded-Proto para saber se é http ou https
app.use(express.json());

// Usado pelo healthcheck do Docker (fica antes do cookie de visitante)
app.get('/api/health', wrap(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

app.use('/api', visitor);

// Cria um link curto, ou devolve o que este visitante já criou para a mesma URL
app.post('/api/links', wrap(async (req, res) => {
  const url = normalizeUrl(req.body && req.body.url);
  if (!url) {
    return res.status(400).json({ code: 'invalid_url', error: 'Invalid URL. Use an address starting with http:// or https://.' });
  }

  const findExisting = async () =>
    (await pool.query('SELECT code, url FROM links WHERE visitor_id = $1 AND url = $2', [req.visitorId, url])).rows[0];
  const reply = (status, link, existing) =>
    res.status(status).json({ code: link.code, url: link.url, shortUrl: `${baseUrl(req)}/${link.code}`, existing });

  // Já existe: não cria outro registro
  let link = await findExisting();
  if (link) return reply(200, link, true);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { rowCount } = await pool.query(
      'INSERT INTO links (code, url, visitor_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [code, url, req.visitorId]
    );
    if (rowCount === 1) return reply(201, { code, url }, false);

    // Nada inserido: o código repetiu, ou uma requisição simultânea acabou de criar este mesmo link
    link = await findExisting();
    if (link) return reply(200, link, true);
  }
  res.status(500).json({ code: 'code_generation_failed', error: 'Could not generate a unique code. Please try again.' });
}));

// Lista os links mais recentes do visitante, com o total de cliques
app.get('/api/links', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.code, l.url, l.created_at AS "createdAt", COUNT(c.id)::int AS clicks
     FROM links l
     LEFT JOIN clicks c ON c.link_id = l.id
     WHERE l.visitor_id = $1
     GROUP BY l.id
     ORDER BY l.id DESC
     LIMIT 50`,
    [req.visitorId]
  );
  const base = baseUrl(req);
  res.json(rows.map((r) => ({ ...r, shortUrl: `${base}/${r.code}` })));
}));

// Cliques por dia de um link (só se for do visitante)
app.get('/api/links/:code/stats', wrap(async (req, res) => {
  const { rows: [link] } = await pool.query(
    'SELECT id, code, url FROM links WHERE code = $1 AND visitor_id = $2',
    [req.params.code, req.visitorId]
  );
  if (!link) return res.status(404).json({ code: 'not_found', error: 'Link not found.' });

  const [perDay, total] = await Promise.all([
    pool.query(`SELECT ${PER_DAY} FROM clicks c WHERE c.link_id = $1 AND ${LAST_14_DAYS} GROUP BY day ORDER BY day`, [link.id]),
    pool.query('SELECT COUNT(*)::int AS total FROM clicks WHERE link_id = $1', [link.id]),
  ]);
  res.json({ code: link.code, url: link.url, total: total.rows[0].total, perDay: perDay.rows });
}));

// Cliques por dia somando todos os links do visitante
app.get('/api/stats', wrap(async (req, res) => {
  const [perDay, total] = await Promise.all([
    pool.query(
      `SELECT ${PER_DAY} FROM clicks c JOIN links l ON l.id = c.link_id
       WHERE l.visitor_id = $1 AND ${LAST_14_DAYS} GROUP BY day ORDER BY day`,
      [req.visitorId]
    ),
    pool.query(
      'SELECT COUNT(*)::int AS total FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.visitor_id = $1',
      [req.visitorId]
    ),
  ]);
  res.json({ total: total.rows[0].total, perDay: perDay.rows });
}));

// Redireciona e registra o clique (302 para o navegador não guardar em cache e todo clique ser contado)
app.get('/:code', wrap(async (req, res, next) => {
  const { rows: [link] } = await pool.query('SELECT id, url FROM links WHERE code = $1', [req.params.code]);
  if (!link) return next();

  try {
    await pool.query('INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)', [
      link.id,
      req.get('referer') || null,
      req.get('user-agent') || null,
    ]);
  } catch (err) {
    console.error('Falha ao registrar o clique:', err.message); // o redirecionamento continua mesmo assim
  }
  res.redirect(302, link.url);
}));

// Quem abre um link curto inexistente vê a mensagem no idioma do navegador
app.use((req, res) => {
  const pt = /^pt/i.test(req.get('accept-language') || '');
  res.status(404).send(pt ? 'Link não encontrado.' : 'Link not found.');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ code: 'generic', error: 'Unexpected error.' });
});

module.exports = app;
