/* The only adapter allowed to connect the site workspace to the core. */
(function(){'use strict';
const C=window.ParagraphMachineCore;
async function evaluatePersian(text){const result=await window.ParagraphLLM.complete([{role:'system',content:C.SYSTEM_PROMPT},{role:'user',content:C.buildGenerationPrompt({count:1,mode:'mixed',input:text,task:'evaluate'})}],{temperature:0.15});return C.validateResult(result).paragraphs[0]}
async function generatePersian(count,mode){const result=await window.ParagraphLLM.complete([{role:'system',content:C.SYSTEM_PROMPT},{role:'user',content:C.buildGenerationPrompt({count,mode,task:'generate'})}],{temperature:0.8});return C.validateResult(result).paragraphs}
window.ParagraphWorkspaceAdapter=Object.freeze({evaluatePersian,generatePersian});
})();