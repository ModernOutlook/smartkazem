/* Adapter between the paragraph workspace UI and the independent core/services. */
(() => {
  'use strict';

  const core = window.ParagraphMachineCore;

  async function evaluatePersian(text) {
    const result = await window.ParagraphLLM.complete(
      [
        { role: 'system', content: core.SYSTEM_PROMPT },
        {
          role: 'user',
          content: core.buildGenerationPrompt({
            count: 1,
            mode: 'mixed',
            input: text,
            task: 'evaluate'
          })
        }
      ],
      { temperature: 0.15 }
    );

    return core.validateResult(result, 1).paragraphs[0];
  }

  async function generatePersian(count, mode) {
    const result = await window.ParagraphLLM.complete(
      [
        { role: 'system', content: core.SYSTEM_PROMPT },
        {
          role: 'user',
          content: core.buildGenerationPrompt({
            count,
            mode,
            task: 'generate'
          })
        }
      ],
      { temperature: 0.8 }
    );

    return core.validateResult(result, count).paragraphs;
  }

  window.ParagraphWorkspaceAdapter = Object.freeze({
    evaluatePersian,
    generatePersian
  });
})();
