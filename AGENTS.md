# Repository Guidelines

## Layout

- `index.html`: app UI and voice flow
- `commands.js`: shared command parser
- `voice_kit.js`: shared voice helpers
- `scripts/local_pipeline.sh`: local compile/test/SAST/Docker pipeline

## Commands

- `npm test`: fast checks
- `npm run dev`: local server on `http://localhost:8787`
- `npm run pipeline`: full local pre-commit flow

## Notes

- Keep changes small and reuse the shared parser and voice helper.
- Run `npm run pipeline` before commit when app behavior changes.
- Set `RUN_VOSK=1` to fetch and test the offline model locally.
