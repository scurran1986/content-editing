// Shared voice-engine helpers for the app and offline test harness.
// Keeps Vosk loading, live-stream wiring, and WAV replay in one place.
(function () {
  const CONFIG = {
    grammar: '["record pause resume stop play rewind fast forward again", "[unk]"]',
    modelUrl: '/fixtures/model.tar.gz',
    scriptUrl: '/node_modules/vosk-browser/dist/vosk.js',
    sampleRate: 16000,
    chunkSize: 4096,
    feedStep: 4000,
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function loadScript(src) {
    if (window.Vosk) return window.Vosk;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Vosk library unavailable'));
      document.head.appendChild(s);
    });
    return window.Vosk;
  }

  async function ensureRuntime() {
    return loadScript(CONFIG.scriptUrl);
  }

  function wireRecognizer(recognizer, handlers) {
    const onPartial = handlers?.onPartial;
    const onFinal = handlers?.onFinal;
    recognizer.on?.('partialresult', message => {
      const text = message?.result?.partial || '';
      if (text) onPartial?.(text, message);
    });
    recognizer.on?.('result', message => {
      const text = message?.result?.text || '';
      if (text) onFinal?.(text, message);
    });
    return recognizer;
  }

  async function createModel(modelUrl = CONFIG.modelUrl) {
    const Vosk = await ensureRuntime();
    return Vosk.createModel(modelUrl);
  }

  async function createLiveEngine({
    stream,
    onPartial,
    onFinal,
    onError,
    modelUrl = CONFIG.modelUrl,
    sampleRate = CONFIG.sampleRate,
    grammar = CONFIG.grammar,
  }) {
    const Vosk = await ensureRuntime();
    if (!stream?.getAudioTracks?.().length) throw new Error('no audio track');
    if (!window.AudioContext) throw new Error('AudioContext not available');

    const audioContext = new AudioContext({ sampleRate });
    await audioContext.resume?.();
    const model = await Vosk.createModel(modelUrl);
    const recognizer = wireRecognizer(new model.KaldiRecognizer(audioContext.sampleRate, grammar), {
      onPartial,
      onFinal,
    });
    recognizer.SetWords?.(true);

    const source = audioContext.createMediaStreamSource(stream);
    const node = audioContext.createScriptProcessor(CONFIG.chunkSize, 1, 1);
    const sink = audioContext.createGain();
    sink.gain.value = 0;
    node.onaudioprocess = event => {
      try {
        recognizer.acceptWaveform(event.inputBuffer);
      } catch (e) {
        onError?.(e);
      }
    };
    source.connect(node);
    node.connect(sink);
    sink.connect(audioContext.destination);

    const stop = async () => {
      try { node.onaudioprocess = null; } catch (e) {}
      try { source.disconnect(); } catch (e) {}
      try { node.disconnect(); } catch (e) {}
      try { sink.disconnect(); } catch (e) {}
      try { await audioContext.close(); } catch (e) {}
      try { recognizer.remove?.(); } catch (e) {}
      try { recognizer.delete?.(); } catch (e) {}
      try { model.terminate?.(); } catch (e) {}
      try { model.delete?.(); } catch (e) {}
    };

    return { audioContext, model, recognizer, source, node, sink, stop };
  }

  async function recognizeWav({
    wavUrl,
    modelUrl = CONFIG.modelUrl,
    sampleRate = CONFIG.sampleRate,
    grammar = CONFIG.grammar,
    onPartial,
    onFinal,
    onError,
    step = CONFIG.feedStep,
    drainMs = 1000,
  }) {
    const model = await createModel(modelUrl);
    const recognizer = wireRecognizer(new model.KaldiRecognizer(sampleRate, grammar), {
      onPartial,
      onFinal,
    });
    recognizer.SetWords?.(true);

    const audioContext = new AudioContext({ sampleRate });
    const buf = await audioContext.decodeAudioData(await (await fetch(wavUrl)).arrayBuffer());
    const pcm = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i += step) {
      try {
        if (recognizer.acceptWaveformFloat) {
          recognizer.acceptWaveformFloat(pcm.subarray(i, i + step), sampleRate);
        } else {
          recognizer.acceptWaveform(pcm.subarray(i, i + step), sampleRate);
        }
      } catch (e) {
        onError?.(e);
      }
      await sleep(30);
    }
    try { recognizer.retrieveFinalResult?.(); } catch (e) {}
    await sleep(drainMs);
    try { recognizer.remove?.(); } catch (e) {}
    try { recognizer.delete?.(); } catch (e) {}
    try { model.terminate?.(); } catch (e) {}
    try { model.delete?.(); } catch (e) {}
    try { audioContext.close?.(); } catch (e) {}
  }

  window.VoiceKit = Object.freeze({
    config: Object.freeze({ ...CONFIG }),
    ensureRuntime,
    createModel,
    createLiveEngine,
    recognizeWav,
    wireRecognizer,
  });
})();
