// Headless smoke: page loads, no JS errors, fake camera works, record->stop produces a clip.
// Not a Safari test. Run: node smoke.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://scurran1986.github.io/content-editing/');
  await p.evaluate(async () => { await actions.record(); });
  await p.waitForTimeout(2500);
  const st1 = await p.textContent('#status');
  await p.evaluate(() => actions.pause());
  const st2 = await p.textContent('#status');
  await p.evaluate(() => actions.resume());
  await p.evaluate(() => actions.stop());
  await p.waitForTimeout(1000);
  const st3 = await p.textContent('#status');
  const hasClip = await p.evaluate(() => !!clip);
  await b.close();
  console.log({ st1, st2, st3, hasClip, errs });
  if (errs.length || st1 !== 'recording' || st2 !== 'paused' || st3 !== 'stopped' || !hasClip) process.exit(1);
})();
