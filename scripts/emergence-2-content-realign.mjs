import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = process.cwd();
const SOURCE = 'content/emergence-2.js';
const TRANSLATIONS = 'translations/emergence-2.json';
const MANIFEST = 'docs/emergence-2-paragraph-manifest.json';
const LANGS = ['en', 'ar', 'zh'];
const EPISODES = Array.from({ length: 11 }, (_, i) => 20 + i);
const WRITE = process.argv.includes('--write');

const fail = message => { throw new Error(message); };
const read = file => fs.readFileSync(file, 'utf8');

function loadSource() {
  const context = { window: {} };
  vm.runInNewContext(read(SOURCE), context, { filename: SOURCE });
  const catalog = context.window.Emergence2Catalog;
  if (!catalog?.episodes?.length) fail('Emergence2Catalog.episodes is unavailable');
  return catalog;
}

function nonEmptyLines(text) {
  return String(text).replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim() !== '');
}

function sourceGroups(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const groups = [];
  let group = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (group.length) { groups.push(group); group = []; }
    } else group.push(line);
  }
  if (group.length) groups.push(group);
  return groups;
}

function wordCount(text) {
  const s = String(text).trim();
  if (!s) return 0;
  if (/^[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(s) || /[\u3400-\u9fff\u3040-\u30ff]/.test(s)) {
    return Array.from(s.replace(/\s+/g, '')).length;
  }
  return (s.match(/\S+/g) || []).length;
}

function splitUnits(text, lang) {
  const s = String(text).trim();
  if (lang === 'zh') return Array.from(s.replace(/\s+/g, ''));
  return s.match(/\S+/g) || [];
}

function joinUnits(units, lang) {
  if (lang === 'zh') return units.join('');
  return units.join(' ');
}

function boundaryScore(text, lang, position, desired) {
  const distance = Math.abs(position - desired);
  const before = text.slice(0, position).trimEnd();
  const ch = before.at(-1) || '';
  const strong = /[.!?؟。！？]/u.test(ch);
  const medium = /[,،:;；…»”\")\]]/u.test(ch);
  const penalty = strong ? 0 : medium ? 1.5 : 4;
  return distance + penalty;
}

function splitByWeights(text, sourceLines, lang) {
  const units = splitUnits(text, lang);
  if (!units.length) fail('Encountered empty translation paragraph');
  const weights = sourceLines.map(line => Math.max(1, wordCount(line)));
  const total = weights.reduce((a, b) => a + b, 0);
  const result = [];
  let previous = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (i === weights.length - 1) {
      result.push(joinUnits(units.slice(previous), lang));
      break;
    }
    const remainingLines = weights.length - i - 1;
    const remainingUnits = units.length - previous;
    if (remainingUnits <= remainingLines) fail(`Cannot allocate translation units for ${lang}: ${sourceLines[i]}`);
    const cumulative = weights.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const desired = Math.max(previous + 1, Math.min(units.length - remainingLines, Math.round(units.length * cumulative / total)));
    let best = desired;
    let bestScore = Number.POSITIVE_INFINITY;
    const radius = Math.min(32, Math.max(8, Math.floor(units.length * 0.08)));
    for (let p = Math.max(previous + 1, desired - radius); p <= Math.min(units.length - remainingLines, desired + radius); p += 1) {
      const prefix = joinUnits(units.slice(0, p), lang);
      const score = boundaryScore(prefix, lang, prefix.length, joinUnits(units.slice(0, desired), lang).length);
      if (score < bestScore) { bestScore = score; best = p; }
    }
    result.push(joinUnits(units.slice(previous, best), lang));
    previous = best;
  }
  if (result.join(lang === 'zh' ? '' : ' ') !== joinUnits(units, lang)) fail(`Translation conservation failure in ${lang}`);
  return result;
}

function normalised(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function assertConservation(before, after, episode, lang) {
  const a = normalised(before.join(' '));
  const b = normalised(after.join(' '));
  if (a !== b) fail(`Content conservation failed for episode ${episode} ${lang}`);
  const beforeCounts = new Map();
  for (const p of before) beforeCounts.set(normalised(p), (beforeCounts.get(normalised(p)) || 0) + 1);
  const afterText = after.map(normalised).join(' ');
  for (const [p, count] of beforeCounts) {
    if ((afterText.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length < count) {
      fail(`A preserved translation fragment disappeared for episode ${episode} ${lang}`);
    }
  }
}

function build() {
  const source = loadSource();
  const reservoir = JSON.parse(read(TRANSLATIONS));
  if (!Array.isArray(reservoir.episodes) || reservoir.episodes.length !== 11) fail('Translation reservoir must contain exactly 11 episodes');
  const manifest = { schema: 1, rule: 'every non-empty Persian source line is exactly one paragraph; blank lines are separators', episodes: [] };

  for (let index = 0; index < 11; index += 1) {
    const sourceEpisode = source.episodes[index];
    const targetEpisode = reservoir.episodes[index];
    const episode = EPISODES[index];
    if (Number(sourceEpisode.number) !== episode || Number(targetEpisode.number) !== episode) fail(`Episode numbering mismatch at ${episode}`);
    const groups = sourceGroups(sourceEpisode.paragraphs);
    const lines = nonEmptyLines(sourceEpisode.paragraphs);
    const entry = { number: episode, title: targetEpisode.title, sourceLineCount: lines.length, sourceBlockCount: groups.length, languages: {} };
    for (const lang of LANGS) {
      const before = targetEpisode.paragraphs?.[lang];
      if (!Array.isArray(before) || before.length !== groups.length) fail(`Episode ${episode} ${lang}: existing translation blocks (${before?.length ?? 0}) do not match Persian blank-line blocks (${groups.length})`);
      const after = [];
      const blockManifest = [];
      let lineIndex = 0;
      for (let g = 0; g < groups.length; g += 1) {
        const split = splitByWeights(before[g], groups[g], lang);
        for (let j = 0; j < split.length; j += 1) {
          after.push(split[j]);
          blockManifest.push({ paragraph: lineIndex + 1, block: g + 1, source: groups[g][j], translation: split[j] });
          lineIndex += 1;
        }
      }
      assertConservation(before, after, episode, lang);
      if (after.length !== lines.length) fail(`Episode ${episode} ${lang}: produced ${after.length}, expected ${lines.length}`);
      if (after.some(p => !String(p).trim() || p.includes('[object Object]'))) fail(`Episode ${episode} ${lang}: empty/placeholder translation paragraph`);
      targetEpisode.paragraphs[lang] = after;
      entry.languages[lang] = { paragraphCount: after.length, blocks: blockManifest };
    }
    if (!['en','ar','zh'].every(lang => entry.languages[lang].paragraphCount === lines.length)) fail(`Episode ${episode}: language counts are not equal`);
    manifest.episodes.push(entry);
  }
  return { reservoir, manifest };
}

const { reservoir, manifest } = build();
const counts = manifest.episodes.map(e => `${e.number}:${e.sourceLineCount}`).join(' ');
console.log(`Emergence II source-line paragraph counts: ${counts}`);
for (const e of manifest.episodes) console.log(`Episode ${e.number}: FA=${e.sourceLineCount} EN=${e.languages.en.paragraphCount} AR=${e.languages.ar.paragraphCount} ZH=${e.languages.zh.paragraphCount}`);

if (WRITE) {
  fs.writeFileSync(TRANSLATIONS, JSON.stringify(reservoir, null, 2) + '\n', 'utf8');
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const readmePath = 'README.md';
  const auditPath = 'docs/canonical-book-content-audit.md';
  const marker = '<!-- emergence-2-paragraph-alignment-2026-10-12 -->';
  const summary = `${marker}\n\n### Emergence II paragraph alignment (episodes 20–30)\n\nFor Chapter Two, Persian source structure is canonical: every non-empty source line is one paragraph and blank lines are separators. Episodes 20–30 were realigned in EN/AR/ZH while preserving translation order and exact concatenated content. The reproducible manifest is \\`docs/emergence-2-paragraph-manifest.json\\`.\n\nCounts: ${manifest.episodes.map(e => `${e.number}=${e.sourceLineCount}`).join(', ')}.\n`;
  for (const file of [readmePath, auditPath]) {
    const current = read(file);
    if (!current.includes(marker)) fs.appendFileSync(file, `\n${summary}`, 'utf8');
  }
}
