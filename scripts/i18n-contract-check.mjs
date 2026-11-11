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

function validateCatalogOrder(reference, value, language, prefix = '') {
  if (Array.isArray(reference) && Array.isArray(value)) {
    if (reference.length !== value.length) {
      errors.push(language + '.json array length differs from fa.json at ' + (prefix || '<root>'));
      return;
    }
    reference.forEach((item, index) => validateCatalogOrder(item, value[index], language, prefix + '[' + index + ']'));
    return;
  }
  if (!reference || !value || typeof reference !== 'object' || typeof value !== 'object' ||
      Array.isArray(reference) || Array.isArray(value)) return;

  const referenceKeys = Object.keys(reference);
  const valueKeys = Object.keys(value);
  const expectedOrder = referenceKeys.filter((key) => Object.prototype.hasOwnProperty.call(value, key));
  const actualOrder = valueKeys.filter((key) => Object.prototype.hasOwnProperty.call(reference, key));
  if (expectedOrder.join('\\0') !== actualOrder.join('\\0')) {
    errors.push(language + '.json key order differs from fa.json at ' + (prefix || '<root>'));
  }
  for (const key of referenceKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      validateCatalogOrder(reference[key], value[key], language, prefix ? prefix + '.' + key : key);
    }
  }
}
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

// Every catalog must expose the same translation-key surface so the runtime
// never silently falls back to Persian when a user selects another language.
for (const language of languages.filter((item) => item !== 'fa')) {
  validateCatalogOrder(catalogs.fa, catalogs[language], language);
}

const allKeys = new Set(languages.flatMap((language) => [...keys[language]]));
for (const key of allKeys) {
  for (const language of languages) {
    if (!keys[language].has(key)) {
      errors.push(language + '.json missing catalog key ' + key);
    }
  }
}

function validateCatalogLanguage(language, value, prefix = '') {
  if (typeof value === 'string') {
    // Flag script leakage across the four supported languages. Proper names
    // and technical Latin acronyms remain allowed in non-Latin catalogs.
    if (['en', 'zh'].includes(language) && /[\u0600-\u06FF]/u.test(value)) {
      errors.push(language + '.json contains Arabic/Persian script at ' + prefix + ': ' + value);
    }
    if (language === 'ar' && /[پچژگکی]/u.test(value)) {
      errors.push(language + '.json contains Persian-specific letters at ' + prefix + ': ' + value);
    }
    if (language !== 'zh' && /[\u4E00-\u9FFF]/u.test(value)) {
      errors.push(language + '.json contains Chinese characters at ' + prefix + ': ' + value);
    }
    if (!value.trim()) errors.push(language + '.json has an empty translation at ' + prefix);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      validateCatalogLanguage(language, child, prefix ? prefix + '.' + key : key);
    }
  }
}

for (const language of languages) {
  validateCatalogLanguage(language, catalogs[language]);
}

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
