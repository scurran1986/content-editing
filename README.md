# Content Editing

VoiceCam is a browser voice-capture POC.

## Run

```bash
npm ci
npm run dev
```

## Check

```bash
npm test
npm run pipeline
```

- `npm test` runs the fast checks.
- `npm run pipeline` runs the full local flow.

## Files

- `index.html` app UI
- `voice_kit.js` shared voice helpers
- `commands.js` parser
- `scripts/local_pipeline.sh` local pipeline
