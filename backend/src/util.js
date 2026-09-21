const { randomBytes } = require('crypto');

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I)
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

module.exports = { ALPHABET, generateCode, normalizeUrl };
