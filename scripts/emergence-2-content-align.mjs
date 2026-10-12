import fs from 'node:fs';

const SOURCE = 'content/emergence-2.js';
const TRANSLATIONS = 'translations/emergence-2.json';
const OUT = 'docs/emergence-2-paragraph-manifest.json';

function extractSourceEpisodes(text) {
  const re = /paragraphs:\"((?:\\.|[^\"])*)\"/g;
  const values = [...text.matchAll(re)].map(m => JSON.parse(`\"${m[1]}\"`));
  if (values.length !== 11) throw new Error(`Expected 11 source paragraph strings, found ${values.length}`);
  return values.map((raw, i) => ({
    number: 20 + i,
    lines: raw.split(/\r?\n/).filter(line => line.trim() !== '')
  }));
}

function splitSentences(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!'.!?؟。！？'.includes(c)) continue;
    while (i + 1 < text.length && '.!?…！？'.includes(text[i + 1])) i++;
    let j = i + 1;
    while (j < text.length && ' \t\r\n»”’\"\'”)]}'.includes(text[j])) j++;
    if (j >= text.length || /\s/.test(text[j])) {
      const s = text.slice(start, j).trim();
      if (s) out.push(s);
      start = j;
      i = j - 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function sentenceCounts(lines) {
  return lines.map(line => splitSentences(line).length);
}

function flattenTranslation(paragraphs) {
  return paragraphs.flatMap(splitSentences);
}

function realign(lines, translatedParagraphs, lang, episode) {
  const counts = sentenceCounts(lines);
  const sourceSentenceTotal = counts.reduce((a, b) => a + b, 0);
  const translated = flattenTranslation(translatedParagraphs);
  if (translated.length !== sourceSentenceTotal) {
    throw new Error(`Episode ${episode} ${lang}: source sentences=${sourceSentenceTotal}, translation sentences=${translated.length}`);
  }
  const result = [];
  let cursor = 0;
  for (const count of counts) {
    result.push(translated.slice(cursor, cursor + count).join(' ').trim());
    cursor += count;
  }
  if (cursor !== translated.length) throw new Error(`Episode ${episode} ${lang}: alignment cursor mismatch`);
  return result;
}

const source = extractSourceEpisodes(fs.readFileSync(SOURCE, 'utf8'));
const data = JSON.parse(fs.readFileSync(TRANSLATIONS, 'utf8'));
const manifest = { schema: 1, rule: 'one non-empty Persian source line = one translation paragraph', episodes: [] };

for (let i = 0; i < source.length; i++) {
  const ep = source[i];
  const target = data.episodes.find(x => x.number === ep.number);
  if (!target) throw new Error(`Missing translation episode ${ep.number}`);
  const aligned = {};
  for (const lang of ['en', 'ar', 'zh']) {
    aligned[lang] = realign(ep.lines, target.paragraphs[lang], lang, ep.number);
    if (aligned[lang].some(p => !p || /\[object Object\]|placeholder/i.test(p))) {
      throw new Error(`Episode ${ep.number} ${lang}: empty/placeholder paragraph`);
    }
  }
  target.paragraphs.en = aligned.en;
  target.paragraphs.ar = aligned.ar;
  target.paragraphs.zh = aligned.zh;
  manifest.episodes.push({
    number: ep.number,
    sourceParagraphCount: ep.lines.length,
    paragraphs: ep.lines.map((fa, n) => ({
      index: n + 1,
      fa,
      en: aligned.en[n],
      ar: aligned.ar[n],
      zh: aligned.zh[n]
    }))
  });
}

fs.writeFileSync(TRANSLATIONS, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');

console.log('Emergence II content alignment completed.');
for (const ep of manifest.episodes) {
  console.log(`Episode ${ep.number}: FA=${ep.sourceParagraphCount} EN=${ep.paragraphs.length} AR=${ep.paragraphs.length} ZH=${ep.paragraphs.length}`);
}
