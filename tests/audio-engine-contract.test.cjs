const assert = require('node:assert/strict');
const fs = require('node:fs');

const engine = fs.readFileSync('audio-engine.js', 'utf8');

assert.match(engine, /function speechChunks\(text,limit=850\)/);
assert.match(engine, /Array\.from\(String\(text/);
assert.match(engine, /remaining\.lastIndexOf\(' ',limit-1\)/);
assert.match(engine, /const NAV_SELECTOR=.*p,li,blockquote,figcaption,td,th,dt,dd,pre/s);
assert.match(engine, /const candidates=\[\.\.\.\(root\.matches\?\.\(NAV_SELECTOR\)\?\[root\]:\[\]\),\.\.\.root\.querySelectorAll\(NAV_SELECTOR\)\]/);
assert.match(engine, /function activateNavigation\(\)[\s\S]*?const text=visibleLocalizedText\(el\);[\s\S]*?if\(text\)speak\(text/);
assert.match(engine, /event\.key\.toLowerCase\(\)==='p'/);
assert.match(engine, /event\.key\.toLowerCase\(\)==='r'/);
assert.match(engine, /function handleLanguageChange\(\)[\s\S]*?speechSynthesis\.cancel\(\)[\s\S]*?announcePage\(\)/);
assert.match(engine, /if\(!state\.accessibility\|\|!state\.speechEnabled\|\|!article/);

console.log('Audio accessibility contract tests passed.');
