const MESSAGES = {
  pt: {
    'page.title': 'Encurtador de links',
    'lang.label': 'Idioma',
    'hero.a': 'Encurte o link.',
    'hero.b': 'Conte cada clique.',
    'input.placeholder': 'Cole aqui o endereço comprido',
    'input.aria': 'Endereço a encurtar',
    'form.submit': 'Encurtar link',
    'shortening': 'Encurtando...',
    'existing': 'Você já tinha encurtado este link. Aqui está ele.',
    'cookie.label': 'Aviso de cookies',
    'cookie.text': 'Usamos um cookie essencial e anônimo só para lembrar quais links são seus. Sem ele, o site não consegue mostrar sua lista.',
    'cookie.ok': 'Entendi',
    'copy.link': 'Copiar link',
    'copy': 'Copiar',
    'copied': 'Copiado',
    'copied.msg': 'Link copiado.',
    'copy.fail': 'Não foi possível copiar. Copie manualmente: {url}',
    'copy.fail.short': 'Não foi possível copiar. Selecione o link e copie manualmente.',
    'links.title': 'Seus links',
    'list.empty': 'Nenhum link ainda. Cole uma URL acima para criar o primeiro.',
    'all.links': 'Todos os links',
    'all.summed.one': 'link somado',
    'all.summed.other': 'links somados',
    'title.all': 'Ver os cliques de todos os links somados',
    'title.link': 'Ver cliques de {url}',
    'title.copy': 'Copiar {url}',
    'aria.copy': 'Copiar link curto de {host}',
    'link.one': 'link',
    'link.other': 'links',
    'click.one': 'clique',
    'click.other': 'cliques',
    'summary': '{links} · {clicks} no total',
    'chart.title': 'Cliques nos últimos 14 dias',
    'chart.total': '{clicks} no total (datas em UTC)',
    'chart.tooltip': '{date}: {clicks}',
    'err.invalid_url': 'URL inválida. Use um endereço começando com http:// ou https://.',
    'err.not_found': 'Link não encontrado.',
    'err.code_generation_failed': 'Não foi possível gerar um código único. Tente novamente.',
    'err.network': 'Não foi possível conectar ao servidor.',
    'err.generic': 'Erro inesperado. Tente novamente.',
  },
  en: {
    'page.title': 'Link shortener',
    'lang.label': 'Language',
    'hero.a': 'Shorten the link.',
    'hero.b': 'Count every click.',
    'input.placeholder': 'Paste your long URL here',
    'input.aria': 'URL to shorten',
    'form.submit': 'Shorten link',
    'shortening': 'Shortening...',
    'existing': 'You already shortened this link. Here it is.',
    'cookie.label': 'Cookie notice',
    'cookie.text': "We use one essential, anonymous cookie just to remember which links are yours. Without it, the site can't show your list.",
    'cookie.ok': 'Got it',
    'copy.link': 'Copy link',
    'copy': 'Copy',
    'copied': 'Copied',
    'copied.msg': 'Link copied.',
    'copy.fail': "Couldn't copy. Copy it manually: {url}",
    'copy.fail.short': "Couldn't copy. Select the link and copy it manually.",
    'links.title': 'Your links',
    'list.empty': 'No links yet. Paste a URL above to create your first one.',
    'all.links': 'All links',
    'all.summed.one': 'link combined',
    'all.summed.other': 'links combined',
    'title.all': 'See clicks for all links combined',
    'title.link': 'See clicks for {url}',
    'title.copy': 'Copy {url}',
    'aria.copy': 'Copy short link for {host}',
    'link.one': 'link',
    'link.other': 'links',
    'click.one': 'click',
    'click.other': 'clicks',
    'summary': '{links} · {clicks} in total',
    'chart.title': 'Clicks in the last 14 days',
    'chart.total': '{clicks} in total (dates in UTC)',
    'chart.tooltip': '{date}: {clicks}',
    'err.invalid_url': 'Invalid URL. Use an address starting with http:// or https://.',
    'err.not_found': 'Link not found.',
    'err.code_generation_failed': "Couldn't generate a unique code. Please try again.",
    'err.network': "Couldn't reach the server.",
    'err.generic': 'Unexpected error. Please try again.',
  },
};

// Idioma: escolha salva > idioma do navegador > inglês
let lang = null;
try {
  lang = localStorage.getItem('lang');
} catch {}
if (!MESSAGES[lang]) lang = (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';

function t(key, vars = {}) {
  const text = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// plural(3, 'click') -> "3 cliques" / "3 clicks"
function plural(n, key) {
  return `${n} ${t(n === 1 ? `${key}.one` : `${key}.other`)}`;
}

function formatDate(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC' });
}

function applyTranslations() {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((n) => (n.textContent = t(n.dataset.i18n)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach((n) => (n.placeholder = t(n.dataset.i18nPlaceholder)));
  document.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

function setLang(next) {
  if (next === lang || !MESSAGES[next]) return;
  lang = next;
  try {
    localStorage.setItem('lang', lang);
  } catch {}
  applyTranslations();
  document.dispatchEvent(new CustomEvent('langchange'));
}

document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
applyTranslations();
