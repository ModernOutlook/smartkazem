/* Targeted regression tests for Paragraph Machine translation failure boundaries. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadBridge(complete) {
  const context = {
    window: { ParagraphLLM: { complete } }
  };
  const source = fs.readFileSync('services/translation-bridge.js', 'utf8');
  vm.runInNewContext(source, context, { filename: 'services/translation-bridge.js' });
  return context.window.ParagraphTranslation;
}

async function main() {
  const bridge = loadBridge(async () => ({ translation: '  ترجمه  ' }));
  assert.equal(await bridge.toPersian('Hello', 'en'), 'ترجمه');

  const emptyTranslation = loadBridge(async () => ({ translation: '  ' }));
  await assert.rejects(
    emptyTranslation.toPersian('Hello', 'en'),
    /ترجمه به فارسی خالی یا نامعتبر است/
  );

  const missingBatchItems = loadBridge(async () => ({ translations: ['فقط یکی'] }));
  await assert.rejects(
    missingBatchItems.fromPersianBatch(['first', 'second'], 'en'),
    /تعداد ترجمه‌ها با تعداد پاراگراف‌ها برابر نیست/
  );

  const emptyBatchItem = loadBridge(async () => ({ translations: ['valid', '  '] }));
  await assert.rejects(
    emptyBatchItem.fromPersianBatch(['first', 'second'], 'en'),
    /یکی از ترجمه‌های خروجی خالی است/
  );

  const upstreamFailure = loadBridge(async () => {
    throw new Error('upstream unavailable');
  });
  await assert.rejects(
    upstreamFailure.fromPersianBatch(['source'], 'zh'),
    /upstream unavailable/
  );

  const persianPassThrough = loadBridge(async () => {
    throw new Error('Persian source should not call the model');
  });
  assert.equal(await persianPassThrough.toPersian('متن فارسی', 'fa'), 'متن فارسی');
  assert.deepEqual(
    Array.from(await persianPassThrough.fromPersianBatch(['متن فارسی'], 'fa')),
    ['متن فارسی']
  );

  console.log('Paragraph Machine translation boundary tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
