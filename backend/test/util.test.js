const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCode, normalizeUrl, ALPHABET } = require('../src/util');

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
