const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCode, normalizeUrl, ALPHABET, readCookie } = require('../src/util');

test('normalizeUrl aceita URLs http e https', () => {
  assert.equal(normalizeUrl('https://example.com'), 'https://example.com/');
  assert.equal(normalizeUrl('http://example.com/path'), 'http://example.com/path');
});

test('normalizeUrl trata espaços nas pontas e host em maiúsculas como o mesmo endereço', () => {
  assert.equal(normalizeUrl('  https://example.com  '), 'https://example.com/');
  assert.equal(normalizeUrl('https://EXAMPLE.com/Path'), normalizeUrl('https://example.com/Path'));
});

test('normalizeUrl rejeita protocolos que não são http/https', () => {
  assert.equal(normalizeUrl('ftp://example.com'), null);
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('mailto:a@b.com'), null);
});

test('normalizeUrl rejeita valores que não são URLs válidas', () => {
  assert.equal(normalizeUrl('não é uma url'), null);
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl(null), null);
  assert.equal(normalizeUrl(undefined), null);
  assert.equal(normalizeUrl(123), null);
});

test('normalizeUrl rejeita URLs maiores que 2048 caracteres', () => {
  const longUrl = `https://example.com/${'a'.repeat(2050)}`;
  assert.equal(normalizeUrl(longUrl), null);
});

test('normalizeUrl remove a porta quando é a padrão do protocolo, mas mantém portas diferentes', () => {
  assert.equal(normalizeUrl('http://example.com:80/'), 'http://example.com/');
  assert.equal(normalizeUrl('https://example.com:443/'), 'https://example.com/');
  assert.equal(normalizeUrl('https://example.com:8443/'), 'https://example.com:8443/');
});

test('normalizeUrl tira espaços, tabs e quebras de linha nas pontas', () => {
  assert.equal(normalizeUrl('\t https://example.com \n'), 'https://example.com/');
});

test('normalizeUrl é idempotente (normalizar de novo o resultado não muda nada)', () => {
  const once = normalizeUrl('https://EXAMPLE.com:443/Path?a=1');
  assert.equal(normalizeUrl(once), once);
});

test('generateCode gera código com 6 caracteres por padrão', () => {
  const code = generateCode();
  assert.equal(code.length, 6);
});

test('generateCode respeita o tamanho informado', () => {
  assert.equal(generateCode(10).length, 10);
  assert.equal(generateCode(1).length, 1);
});

test('generateCode só usa caracteres do alfabeto sem ambiguidade (sem 0, O, 1, l, I)', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode(20);
    for (const char of code) {
      assert.ok(ALPHABET.includes(char), `caractere inesperado: ${char}`);
    }
    assert.doesNotMatch(code, /[0O1lI]/);
  }
});

test('readCookie encontra o cookie certo entre vários', () => {
  assert.equal(readCookie('a=1; visitor_id=abc-123; b=2', 'visitor_id'), 'abc-123');
});

test('readCookie decodifica valores com percent-encoding', () => {
  assert.equal(readCookie('visitor_id=abc%2Fdef', 'visitor_id'), 'abc/def');
});

test('readCookie devolve null quando o cookie não existe ou o cabeçalho está vazio', () => {
  assert.equal(readCookie('a=1; b=2', 'visitor_id'), null);
  assert.equal(readCookie('', 'visitor_id'), null);
  assert.equal(readCookie(undefined, 'visitor_id'), null);
  assert.equal(readCookie(null, 'visitor_id'), null);
});

test('readCookie devolve null (em vez de lançar erro) com percent-encoding inválido', () => {
  assert.equal(readCookie('visitor_id=%', 'visitor_id'), null);
  assert.equal(readCookie('visitor_id=%E0%A4%A', 'visitor_id'), null);
});

test('readCookie usa a primeira ocorrência quando o nome aparece repetido', () => {
  assert.equal(readCookie('visitor_id=first; visitor_id=second', 'visitor_id'), 'first');
});

test('readCookie devolve string vazia quando o cookie existe mas não tem valor', () => {
  assert.equal(readCookie('visitor_id=; b=2', 'visitor_id'), '');
});

test('generateCode com tamanho 0 devolve string vazia', () => {
  assert.equal(generateCode(0), '');
});
