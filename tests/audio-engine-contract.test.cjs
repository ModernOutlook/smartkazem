const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const engine = fs.readFileSync('audio-engine.js', 'utf8');

assert.match(engine, /function speechChunks\(text,limit=850\)/);
assert.match(engine, /Array\.from\(String\(text/);
assert.match(engine, /remaining\.lastIndexOf\(' ',limit-1\)/);
assert.match(engine, /const NAV_SELECTOR=.*p,li,blockquote,figcaption,td,th,dt,dd,pre/s);
assert.match(engine, /const candidates=/);
assert.match(engine, /function activateNavigation\(\)[\s\S]*?const text=visibleLocalizedText\(el\);[\s\S]*?if\(text\)speak\(text/);
assert.match(engine, /event\.key\.toLowerCase\(\)==='p'/);
assert.match(engine, /event\.key\.toLowerCase\(\)==='r'/);
assert.match(engine, /function handleLanguageChange\(\)[\s\S]*?speechSynthesis\.cancel\(\)[\s\S]*?announcePage\(\)/);
assert.match(engine, /function toggleNativeScreenReaderMode\(\)/);
assert.match(engine, /function ensureNativeScreenReaderControl\(\)/);
assert.match(engine, /state\.nativeScreenReader\|\|!state\.speechEnabled/);
assert.match(engine, /navRegion\.setAttribute\('aria-live',state\.nativeScreenReader\?'off':'assertive'\)/);
assert.match(engine, /if\(!state\.accessibility\|\|!state\.speechEnabled\|\|!article/);
assert.match(engine, /event\.ctrlKey&&event\.altKey&&event\.shiftKey&&event\.key\.toLowerCase\(\)==='a'/);

// Execute the production chunker itself, without requiring browser APIs.
const start = engine.indexOf('function speechChunks(text,limit=850){');
const end = engine.indexOf('\n  function readArticle(article){', start);
assert.notEqual(start, -1, 'speechChunks must exist');
assert.ok(end > start, 'speechChunks must end before readArticle');
const speechChunks = vm.runInNewContext('(' + engine.slice(start, end).trim() + ')');

for (const sample of [
  'A long English sentence. '.repeat(180),
  'هذه فقرة عربية طويلة. '.repeat(180),
  'این یک متن فارسی طولانی است. '.repeat(180),
  '这是一个没有空格的中文长文本。'.repeat(180),
]) {
  const chunks = speechChunks(sample, 120);
  assert.ok(chunks.length > 1, 'long text must split into multiple chunks');
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 120), 'chunks must respect the character limit');
  assert.equal(chunks.join('').replace(/\s+/gu, ''), sample.trim().replace(/\s+/gu, ''), 'chunking must preserve all non-whitespace text');
}

assert.deepEqual(Array.from(speechChunks('  Short text.  ', 120)), ['Short text.']);
assert.deepEqual(Array.from(speechChunks('', 120)), []);

console.log('Audio accessibility contract and speech chunking tests passed.');
