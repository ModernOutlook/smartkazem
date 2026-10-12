/* Node-only regression tests for the Paragraph Machine core. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('engine/paragraph-engine.js', 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'engine/paragraph-engine.js' });
const core = context.window.ParagraphMachineCore;

assert.deepEqual(Array.from(core.DOMAIN_ORDER), ['S', 'T', 'E', 'R', 'C']);
assert.deepEqual(
  Object.keys(core.REALM_CRITERIA),
  ['S', 'T', 'E', 'R', 'C']
);
assert.equal(core.DOMAIN_NAMES.S, 'ساختار');
assert.equal(core.DOMAIN_NAMES.T, 'تداوم');
assert.equal(core.DOMAIN_NAMES.E, 'تجربه');
assert.equal(core.DOMAIN_NAMES.R, 'شبیه‌سازی');
assert.equal(core.DOMAIN_NAMES.C, 'سهام');
assert.equal(core.ALL_CRITERIA.S.length, 9);
assert.equal(core.ALL_CRITERIA.T.length, 9);
assert.equal(core.ALL_CRITERIA.E.length, 11);
assert.equal(core.ALL_CRITERIA.R.length, 10);
assert.equal(core.ALL_CRITERIA.C.length, 10);

const generated = core.validateGeneratedResult({ paragraphs: [{ text: 'A short paragraph.' }] }, 1);
assert.equal(generated.paragraphs[0].text, 'A short paragraph.');
assert.throws(() => core.validateGeneratedResult({ paragraphs: [] }, 1), /تعداد پاراگراف/);
assert.throws(() => core.validateGeneratedResult({ paragraphs: [{ text: 'x'.repeat(901) }] }, 1), /محدودیت‌های سخت/);
assert.throws(() => core.validateGeneratedResult({ paragraphs: [{ text: Array(146).fill('word').join(' ') }] }, 1), /محدودیت‌های سخت/);
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
assert.match(core.buildGenerationPrompt({ language: 'en', mode: 'mixed' }), /language whose code is "en"/);
assert.match(core.buildGenerationPrompt({ language: 'en', mode: 'mixed' }), /Do not generate judgments/);
assert.match(core.buildEvaluationPrompt('Exact source text'), /Exact source text/);
console.log('Paragraph Machine core tests passed.');
