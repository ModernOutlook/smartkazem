/* Node-only regression tests for Paragraph Machine core and adapter contracts. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function main() {
  const coreSource = fs.readFileSync('engine/paragraph-engine.js', 'utf8');
  const adapterSource = fs.readFileSync('adapters/paragraph-workspace.js', 'utf8');
  const context = { window: {} };
  vm.runInNewContext(coreSource, context, { filename: 'engine/paragraph-engine.js' });
  const core = context.window.ParagraphMachineCore;

  assert.deepEqual(Array.from(core.DOMAIN_ORDER), ['S', 'T', 'E', 'R', 'C']);
  assert.deepEqual(Object.keys(core.REALM_CRITERIA), ['S', 'T', 'E', 'R', 'C']);
  assert.equal(core.DOMAIN_NAMES.S, 'ساختار');
  assert.equal(core.DOMAIN_NAMES.T, 'تداوم');
  assert.equal(core.DOMAIN_NAMES.E, 'تجربه');
  assert.equal(core.DOMAIN_NAMES.R, 'شبیه‌سازی');
  assert.equal(core.DOMAIN_NAMES.C, 'سهام');
  assert.deepEqual(
    core.DOMAIN_ORDER.map(domain => core.ALL_CRITERIA[domain].length),
    [9, 9, 11, 10, 10]
  );

  assert.equal(core.validateGeneratedResult({ paragraphs: [{ text: 'A short paragraph.' }] }, 1).paragraphs[0].text, 'A short paragraph.');
  assert.throws(() => core.validateGeneratedResult({ paragraphs: [] }, 1), /تعداد پاراگراف/);
  assert.throws(() => core.validateGeneratedResult({ paragraphs: [{ text: 'x'.repeat(901) }] }, 1), /محدودیت‌های سخت/);
  assert.throws(() => core.validateGeneratedResult({ paragraphs: [{ text: Array(145).fill('word').join(' ') }] }, 1), /محدودیت‌های سخت/);
  assert.throws(() => core.validateGeneratedResult({ paragraphs: [{ text: 'x'.repeat(35) }] }, 1), /محدودیت‌های سخت/);

  const validJudgment = {};
  for (const domain of core.DOMAIN_ORDER) validJudgment[domain] = { status: 'warn', reason: 'No explicit confirmation or violation.' };
  assert.equal(core.validateEvaluation({ judgment: validJudgment }), validJudgment);
  assert.throws(() => core.validateEvaluation({ judgment: { ...validJudgment, C: { status: 'unknown', reason: 'bad' } } }), /قلمرو C/);
  assert.throws(() => core.validateEvaluation({ judgment: { ...validJudgment, R: { status: 'ok', reason: ' ' } } }), /دلیل داوری/);

  const criteria = core.DOMAIN_ORDER.reduce((result, domain) => {
    result[domain] = core.ALL_CRITERIA[domain].map(item => item.text);
    return result;
  }, {});
  const systemPrompt = core.buildSystemPrompt(criteria, 'English');
  assert.match(systemPrompt, /Modal words/);
  assert.match(systemPrompt, /definite violation overrides confirmations/);
  assert.doesNotMatch(systemPrompt, /R-ADJ-2/);
  assert.match(systemPrompt, /Structure/);
  assert.match(core.buildGenerationPrompt({ language: 'en', mode: 'mixed' }), /language whose code is "en"/);
  assert.match(core.buildGenerationPrompt({ language: 'en', mode: 'mixed' }), /Do not generate judgments/);
  assert.match(core.buildEvaluationPrompt('Exact source text'), /Exact source text/);

  let translationCalls = 0;
  let verificationCalls = 0;
  let generationCalls = 0;
  let judgmentCalls = 0;
  let invalidJudgmentsRemaining = 0;
  let alwaysInvalidJudgment = false;
  let lastJudgedText = '';
  let generationPrompt = '';
  context.window.ParagraphTranslation = {
    fromPersianBatch: async texts => {
      translationCalls += 1;
      return texts.map(text => text.replace(/^([MSTERC]\d+):\s*/, '$1: translated '));
    },
    toPersian: async () => { throw new Error('The paragraph itself must not be translated.'); },
    fromPersian: async () => { throw new Error('Unused translation path.'); }
  };
  context.window.ParagraphLLM = {
    complete: async (messages) => {
      const system = messages[0].content;
      const userText = messages.find(message => message.role === 'user' && message.content.includes('PARAGRAPH:'));
      if (system.includes('strict bilingual auditor')) {
        verificationCalls += 1;
        const payload = JSON.parse(messages[messages.length - 1].content);
        return { checks: payload.items.map(item => ({ id: item.id, faithful: true, issue: '' })) };
      }
      if (userText) {
        judgmentCalls += 1;
        lastJudgedText = userText.content.split('PARAGRAPH:\n')[1];
        if (alwaysInvalidJudgment || invalidJudgmentsRemaining > 0) {
          invalidJudgmentsRemaining = Math.max(0, invalidJudgmentsRemaining - 1);
          return {};
        }
        return { judgment: validJudgment };
      }
      generationCalls += 1;
      generationPrompt = messages[messages.length - 1].content;
      return { paragraphs: [{ text: 'A generated English paragraph.' }] };
    }
  };
  vm.runInNewContext(adapterSource, context, { filename: 'adapters/paragraph-workspace.js' });
  const adapter = context.window.ParagraphWorkspaceAdapter;

  const original = '  Original English paragraph.  ';
  const evaluated = await adapter.evaluateText(original, 'en');
  assert.equal(evaluated.text, original, 'evaluation must preserve the exact original input');
  assert.equal(lastJudgedText, original, 'the judge must receive the original paragraph');
  assert.equal(translationCalls, 1, 'criteria should be translated once and cached');
  assert.equal(verificationCalls, 1, 'translated criteria should be semantically checked before use');

  const generated = await adapter.generateParagraphs(1, 'mixed', 'en');
  assert.equal(generated[0].text, 'A generated English paragraph.');
  assert.match(generationPrompt, /language whose code is "en"/);
  assert.doesNotMatch(generationPrompt, /judgment.*status/i);
  await adapter.evaluateText(generated[0].text, 'en');
  assert.equal(generationCalls, 1);
  assert.equal(judgmentCalls, 2, 'generation and judgment must be separate model calls');

  invalidJudgmentsRemaining = 2;
  const repaired = await adapter.evaluateText('Retry this paragraph.', 'en');
  assert.equal(repaired.judgment.S.status, 'warn');
  assert.equal(judgmentCalls, 5, 'two invalid judgment outputs should be retried with a bounded third attempt');

  alwaysInvalidJudgment = true;
  await assert.rejects(adapter.evaluateText('Invalid output paragraph.', 'en'), /داوری به‌دلیل پاسخ نامعتبر/);
  assert.equal(judgmentCalls, 8, 'invalid judgment must stop after three attempts');
  console.log('Paragraph Machine core and adapter tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
