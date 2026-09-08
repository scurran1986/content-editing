// Headless proof of the offline fallback: load vosk-browser in real Chromium, feed it
// our pre-recorded commands.wav, assert every one of the 8 commands is recognized and
// maps through the REAL parseCommand. No mic, no phone. This is the S1-fail fallback,
// made deterministic. Run: node test_vosk.js  (needs devserver.py on :8787 or set URL)
const assert = require('node:assert');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { chromium } = require('playwright');

const EXPECT = ['record', 'pause', 'resume', 'stop', 'play', 'rewind', 'forward', 'again'];

// The 40MB model is gitignored (too big for the repo). Fetch + pack it on first run.
// Same model the production vosk fallback would serve from GitHub Pages.
function ensureModel() {
  if (fs.existsSync('fixtures/model.tar.gz')) return;
  console.log('fetching vosk model (once, ~40MB)...');
  const url = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip';
  execSync(`curl -sL -o /tmp/vm.zip "${url}" && unzip -q -o /tmp/vm.zip -d /tmp/ && ` +
    `tar -czf "${process.cwd()}/fixtures/model.tar.gz" -C /tmp/vosk-model-small-en-us-0.15 .`,
    { stdio: 'inherit' });
}

(async () => {
  ensureModel();
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error') console.error('page:', m.text()); });
  await p.goto((process.env.URL || 'http://localhost:8787') + '/test_vosk.html');
  const out = await p.evaluate(() => runVosk('/fixtures/commands.wav'), null);
  await b.close();

  console.log('finals  :', out.finals.join(' | '));
  console.log('commands:', out.commands.join(' '));

  // Every command must appear, in order. vosk may split/repeat finals, so check the
  // command sequence contains each expected command at least once, order-preserving.
  let i = 0;
  for (const cmd of out.commands) if (cmd === EXPECT[i]) i++;
  assert.equal(i, EXPECT.length,
    `expected all of [${EXPECT}] in order; got [${out.commands}]`);

  console.log('vosk ok');
})().catch(e => { console.error(e); process.exit(1); });
