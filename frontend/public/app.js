const $ = (selector) => document.querySelector(selector);
const form = $('#form');
const input = $('#url');
const msg = $('#msg');
const result = $('#result');
const short = $('#short');
const list = $('#list');
const chartWrap = $('#chart-wrap');

let selected = null; // null = consolidado (todos os links); senão, o código do link

async function api(path, options) {
  let res;
  try {
    res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error(t('err.network'));
  }
  const data = await res.json().catch(() => ({}));
  // O servidor manda um "code"; o texto vem das traduções, no idioma escolhido
  if (!res.ok) throw new Error(data.code ? t(`err.${data.code}`) : t('err.generic'));
  return data;
}

function setMessage(text, isError = false) {
  msg.textContent = text;
  msg.classList.toggle('error', isError);
}

// Sempre usa textContent (nunca innerHTML) porque as URLs vêm do usuário
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function faviconEl(host, small = false) {
  const suffix = small ? ' small' : '';
  const icon = el('img', `favicon${suffix}`);
  icon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  icon.alt = '';
  icon.width = icon.height = small ? 28 : 34;
  // Se o site não tiver ícone, mostra a inicial do domínio
  icon.addEventListener('error', () => icon.replaceWith(el('span', `favicon fallback${suffix}`, host.charAt(0).toUpperCase())));
  return icon;
}

function allIconEl(small = false) {
  const icon = el('img', `favicon all${small ? ' small' : ''}`);
  icon.src = 'logo.svg';
  icon.alt = '';
  icon.width = icon.height = small ? 28 : 34;
  return icon;
}

// Copia para a área de transferência. A API moderna só funciona em HTTPS (ou localhost);
// em http comum usamos o método antigo, com um campo de texto temporário.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    field.remove();
    return ok;
  }
}

async function loadLinks() {
  const links = await api('/api/links');
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  $('#summary').textContent = links.length ? t('summary', { links: plural(links.length, 'link'), clicks: plural(totalClicks, 'click') }) : '';
  list.replaceChildren();

  if (!links.length) {
    list.append(el('li', 'empty', t('list.empty')));
    return;
  }

  // Item do consolidado
  const allItem = el('li', selected === null ? 'item selected' : 'item');
  const allSelect = el('button', 'select');
  allSelect.type = 'button';
  allSelect.setAttribute('aria-pressed', String(selected === null));
  allSelect.title = t('title.all');
  allSelect.addEventListener('click', () => selectLink(null));
  const allText = el('span', 'text');
  allText.append(el('span', 'host', t('all.links')), el('span', 'dest', plural(links.length, 'all.summed')));
  allSelect.append(allIconEl(), allText, el('span', 'count', String(totalClicks)));
  allItem.append(allSelect);
  list.append(allItem);

  for (const link of links) {
    const host = hostOf(link.url);
    const item = el('li', link.code === selected ? 'item selected' : 'item');

    const select = el('button', 'select');
    select.type = 'button';
    select.setAttribute('aria-pressed', String(link.code === selected));
    select.title = t('title.link', { url: link.shortUrl });
    select.addEventListener('click', () => selectLink(link.code));

    const text = el('span', 'text');
    text.append(el('span', 'host', host), el('span', 'dest', link.url));
    select.append(faviconEl(host), text, el('span', 'count', String(link.clicks)));

    const copy = el('button', 'copy-btn', t('copy'));
    copy.type = 'button';
    copy.title = t('title.copy', { url: link.shortUrl });
    copy.setAttribute('aria-label', t('aria.copy', { host }));
    copy.addEventListener('click', async () => {
      if (await copyText(link.shortUrl)) {
        copy.textContent = t('copied');
        setTimeout(() => (copy.textContent = t('copy')), 1500);
      } else {
        setMessage(t('copy.fail', { url: link.shortUrl }), true);
      }
    });

    item.append(select, copy);
    list.append(item);
  }
}

function lastDays(count) {
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.now() - (count - 1 - i) * 86400000).toISOString().slice(0, 10)
  );
}

async function renderChart(code) {
  const stats = await api(code ? `/api/links/${code}/stats` : '/api/stats');
  const byDay = Object.fromEntries(stats.perDay.map((d) => [d.day, d.clicks]));
  const days = lastDays(14);
  const max = Math.max(1, ...days.map((d) => byDay[d] || 0));

  const chart = el('div', 'chart');
  for (const day of days) {
    const value = byDay[day] || 0;
    const col = el('div', 'col');
    col.title = t('chart.tooltip', { date: formatDate(day), clicks: plural(value, 'click') });
    const bar = el('div', value ? 'bar' : 'bar zero');
    bar.style.height = `${(value / max) * 100}%`;
    col.append(el('span', undefined, value ? String(value) : ''), bar, el('span', undefined, day.slice(8)));
    chart.append(col);
  }

  const head = el('p', 'chart-head');
  const info = el('span', undefined, t('chart.total', { clicks: plural(stats.total, 'click') }));
  if (code) {
    const host = hostOf(stats.url);
    head.append(faviconEl(host, true), el('strong', undefined, host), info);
  } else {
    head.append(allIconEl(true), el('strong', undefined, t('all.links')), info);
  }
  chartWrap.replaceChildren(el('h2', undefined, t('chart.title')), head, chart);
}

async function selectLink(code) {
  selected = code;
  await Promise.all([loadLinks(), renderChart(code)]);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(t('shortening'));
  try {
    const link = await api('/api/links', { method: 'POST', body: JSON.stringify({ url: input.value.trim() }) });
    short.textContent = link.shortUrl;
    short.href = link.shortUrl;
    result.hidden = false;
    input.value = '';
    setMessage(link.existing ? t('existing') : '');
    await selectLink(link.code);
  } catch (err) {
    setMessage(err.message, true);
  }
});

$('#copy').addEventListener('click', async () => {
  setMessage(...((await copyText(short.href)) ? [t('copied.msg')] : [t('copy.fail.short'), true]));
});

// Ao trocar o idioma, redesenha a lista e o gráfico com os novos textos
document.addEventListener('langchange', () => {
  setMessage('');
  selectLink(selected).catch((err) => setMessage(err.message, true));
});

selectLink(null).catch((err) => setMessage(err.message, true));

// Aviso do cookie essencial: aparece até a pessoa clicar em "Entendi"
const cookieNotice = $('#cookie-notice');
let noticeSeen = false;
try {
  noticeSeen = localStorage.getItem('cookie-notice') === 'ok';
} catch {}
cookieNotice.hidden = noticeSeen;
$('#cookie-ok').addEventListener('click', () => {
  cookieNotice.hidden = true;
  try {
    localStorage.setItem('cookie-notice', 'ok');
  } catch {}
});
