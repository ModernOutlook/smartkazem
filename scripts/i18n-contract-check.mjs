import fs from 'node:fs';
import path from 'node:path';

const languages = ['fa', 'en', 'ar', 'zh'];
const catalogs = Object.fromEntries(languages.map((language) => [
  language,
  JSON.parse(fs.readFileSync(path.join('translations', language + '.json'), 'utf8')),
]));

function flatten(value, prefix = '', result = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, prefix ? prefix + '.' + index : String(index), result));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? prefix + '.' + key : key, result);
    }
  } else if (prefix) {
    result.add(prefix);
  }
  return result;
}

const keys = Object.fromEntries(languages.map((language) => [language, flatten(catalogs[language])]));
const htmlFiles = fs.readdirSync('.').filter((file) => file.endsWith('.html')).sort();
const errors = [];
let attributeCount = 0;
let accessibleNameCount = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const keyPattern = /\b(data-i18n(?:-html|-aria|-title|-placeholder)?)=["']([^"']+)["']/g;
  for (const match of html.matchAll(keyPattern)) {
    const attribute = match[1];
    const key = match[2];
    attributeCount++;
    for (const language of languages) {
      if (!keys[language].has(key)) errors.push(file + ': ' + attribute + '="' + key + '" missing in ' + language + '.json');
    }
    if (attribute === 'data-i18n-aria') accessibleNameCount++;
  }

  const tagPattern = /<[a-z][^>]*\baria-label=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const tag = match[0];
    const label = match[1];
    if (/[\u0600-\u06FF]/u.test(label) && !/\bdata-i18n-aria=["']/.test(tag)) {
      errors.push(file + ': Persian/Arabic static aria-label lacks data-i18n-aria: ' + label);
    }
  }
}

const parityMissing = [];
for (const key of keys.fa) {
  if (!key.startsWith('labels.')) continue;
  for (const language of ['en', 'ar', 'zh']) {
    if (!keys[language].has(key)) parityMissing.push(language + '.json missing catalog key ' + key);
  }
}
errors.push(...parityMissing);

console.log('Root HTML files scanned: ' + htmlFiles.length);
console.log('Translation attributes scanned: ' + attributeCount);
console.log('Localized accessible-name hooks: ' + accessibleNameCount);
if (errors.length) {
  console.error(errors.join('\n'));
  console.error('i18n contract failed with ' + errors.length + ' issue(s).');
  process.exitCode = 1;
} else {
  console.log('i18n contract passed: every declared translation key resolves in fa/en/ar/zh and Persian/Arabic accessible names are localized.');
}
