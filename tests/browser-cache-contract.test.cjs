const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/ui-browser.yml', 'utf8');
const key = workflow.split('\n').find(line => line.includes('key: smartkazem-browser-'));
assert.ok(key, 'browser cache key must exist');
for (const fragment of [
  '${{ runner.os }}',
  '${{ runner.arch }}',
  'node22',
  'playwright1.55.0',
  'chromium-v2'
]) assert.ok(key.includes(fragment), 'cache key must include ' + fragment);

assert.match(workflow, /gh release download "\$TAG" --repo ModernOutlook\/GPT/);
assert.match(workflow, /sha256sum --check "\$CHECKSUM"/);
assert.match(workflow, /pkg\.version!=='1\.55\.0'/);
assert.match(workflow, /fs\.existsSync\(chromium\.executablePath\(\)\)/);
assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.approve_browser_download == true/);
assert.match(workflow, /if: \(steps\.browser-bundle\.outputs\.imported == 'true' \|\| steps\.browser-install\.outcome == 'success'\) && steps\.browser-cache\.outputs\.cache-hit != 'true'/);
assert.match(workflow, /Playwright 1\.55\.0 and its cached Chromium executable are unavailable/);
assert.doesNotMatch(workflow, /restore-keys:/);

console.log('Browser cache contract tests passed.');
