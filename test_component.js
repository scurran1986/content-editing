// Component tests: real page in headless Chromium, fake media devices, FAKE SpeechRecognition
// injected before page scripts so we can drive onresult/onerror/onend deterministically.
// Run: node test_component.js   (needs devserver.py on :8787 or set URL)
const assert = require('node:assert');
const { chromium } = require('playwright');

const FAKE_SR = `
  window.SpeechRecognition = window.webkitSpeechRecognition = class {
    constructor() { window.__sr = this; this.starts = 0; }
    start() { if (this.active) throw new DOMException('already started', 'InvalidStateError'); this.active = true; this.starts++; this.onstart?.(); }
    stop() { this.active = false; this.onend?.(); }
    say(text, isFinal = true) { const r = [{ transcript: text }]; r.isFinal = isFinal; this.onresult({ results: [r] }); }
    fail(error) { this.onerror?.({ error }); this.active = false; this.onend?.(); }
  };`;

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE_SR);
  await p.goto(process.env.URL || 'http://localhost:8787/');
  const st = () => p.textContent('#status');
  const say = (t, f) => p.evaluate(([t, f]) => __sr.say(t, f), [t, f]);
  const tick = () => p.evaluate(() => { lastCmd = 0; });   // skip the 1.5s debounce between commands

  await p.click('#mic');
  await p.waitForFunction(() => __sr.active && stream);

  // full voice flow
  await say('record'); await p.waitForFunction(() => rec && rec.state === 'recording');
  assert.equal(await st(), 'recording');
  await tick(); await say('pause');  assert.equal(await st(), 'paused');
  await tick(); await say('resume'); assert.equal(await st(), 'recording');
  await tick(); await say('I really need to stop now'); assert.equal(await st(), 'recording', 'long sentence must not fire');
  await p.waitForFunction(() => chunks.length >= 1 && chunks[0].size > 0);   // fake cam needs real time to emit bytes
  await tick(); await say('stop');   await p.waitForFunction(() => state === 'stopped');
  assert.ok(await p.evaluate(() => !!clip), 'clip produced');
  await p.waitForFunction(() => document.getElementById('v').readyState >= 1);

  // debounce: interim + final of same word = ONE action
  await tick(); await say('play', false); await say('play', true);
  assert.equal(await st(), 'playing');

  // echo guard: while playing, "record" heard from the speaker must not start a new take
  await tick(); await say('record'); assert.equal(await st(), 'playing');
  await tick(); await say('stop');   assert.equal(await st(), 'stopped');

  // retake: "again" while recording discards and restarts
  await tick(); await say('record'); await p.waitForFunction(() => rec && rec.state === 'recording');
  await tick(); await say('again');  await p.waitForFunction(() => rec && rec.state === 'recording' && chunks.length === 0);
  await tick(); await say('stop');   await p.waitForFunction(() => state === 'stopped');

  // recognizer lifecycle: restartable error -> exactly one restart; fatal -> none
  const before = await p.evaluate(() => __sr.starts);
  await p.evaluate(() => __sr.fail('network')); await p.waitForTimeout(400);
  assert.equal(await p.evaluate(() => __sr.starts), before + 1, 'network error restarts once');
  await p.evaluate(() => __sr.fail('not-allowed')); await p.waitForTimeout(400);
  assert.equal(await p.evaluate(() => __sr.starts), before + 1, 'not-allowed does not restart');

  await b.close();
  assert.deepEqual(errs, []);
  console.log('component ok');
})().catch(e => { console.error(e); process.exit(1); });
