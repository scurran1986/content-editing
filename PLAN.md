# Content Editing App — Plan v0 (draft, not approved)

Status: DESIGN. No code until architecture + open questions are settled.

## Objective
Phone-first video editing app for content creators. Hands-free voice control
of record/playback (pause, play, fast forward, rewind, stop) is the wedge feature.

## Working assumption (confirm with Sean)
Single phone app. Creator records and edits ON the phone, controls it by voice
while filming solo (no hands, no tripod dance). Not a desktop app remote-controlling phones.

## Open questions (block architecture)
1. Voice control scope: recording only, or also editing ("cut that", "trim last 3s")?
2. Platform: iOS first, Android first, or both (cross-platform stack)?
3. Business model: free+subscription, one-time, or creator-tier only? Affects cloud vs on-device.
4. Solo creator only, or multi-phone (two devices filming, one controls)?

## Feature ideas (unranked, to be cut down)
Recording: voice start/stop/pause, countdown, teleprompter, multi-take, auto-retake on "again".
Playback: voice scrub, speed control, mark good/bad take by voice.
Editing: auto-cut silences, auto-captions, jump cuts, B-roll slots, aspect crop (9:16/1:1/16:9), templates.
Export: per-platform presets (TikTok/Reels/Shorts/YouTube), direct share.
Later: cloud sync, collab, AI titles/hooks, multi-cam.

## MVP (locked 2026-09-08 by Sean: "start with voice controls that are simple")
Phase 1 = voice control ONLY. Record video; say "pause", "play", "stop",
"rewind", "fast forward". No editing, no captions, no export presets.
Success = 5 commands recognized reliably while recording, phone across the room.
Everything in "Feature ideas" is deferred until Phase 1 is proven in hand.

## Phase 1 research gates (each needs its own evidence before choosing)
- Command engine: on-device, offline, <500ms, works with mic shared by recorder.
- Mic sharing: can speech recognizer and video recorder read the same mic stream?
- Echo: playback audio must not trigger commands (rewind/play loops).
- False positives: creator talking to camera says "stop" mid-sentence.
- Wake word vs always-listening vs push-to-talk fallback.

## Research round 1 results (2026-09-08)
A. Competitors: FAILED (agent rate-limited). Re-running.
B. Voice engines: DONE -> research/speech-command-recognition.txt
   Leading picks: iOS = SFSpeechRecognizer on-device (free). Android = Vosk (Apache-2.0).
   Cross-platform if paid = Picovoice Rhino (~32ms, quote-based B2B pricing).
   Ruled out: Whisper (seconds of latency), platform KWS (no public API).
   Hard requirement surfaced: echo cancellation or push-to-talk, else playback
   audio saying "play"/"stop" self-triggers.
C. Stack: UNVERIFIED (agent had no network). Tentative: RN/Expo + vision-camera
   + thin native modules, OR pure Swift if iOS-first. Flutter ruled out.
   ffmpeg-kit retirement + lib health must be verified before trusting.

## Research round 2 results (2026-09-08)
Agents blocked on network approval prompts; did it directly from this session.
A2. Competitors: NOT DONE. Deprioritized — iOS voice MVP doesn't depend on it.
C2. Lib verification (GitHub API, research/raw/*.json):
    ffmpeg-kit ARCHIVED (confirmed). vosk-api, Picovoice rhino,
    expo-speech-recognition all active as of Aug/Sep 2026.
    Irrelevant now: iOS-first = pure Swift, zero third-party deps.
D.  iOS mic sharing: DONE -> research/ios-mic-sharing.txt
    AVCaptureAudioDataOutput -> appendAudioSampleBuffer is a documented path.
    No mic conflict. Echo still needs a device test.

## Phase 1 architecture (settled)
Swift/SwiftUI, AVFoundation capture, SFSpeechRecognizer on-device.
Single capture session fans audio buffers to movie file + recognizer.
Match last recognized word against 5 commands. No SDKs.

## Next: device test, not more research
Needs a Mac + Xcode + iPhone. Blocker until Sean confirms hardware.

## Decision log
- 2026-09-08: Plan drafted.
- 2026-09-08: Sean: iOS first. Android deferred. Vosk/Picovoice/RN research kept for later only.
- 2026-09-08: Sean: Phase 1 = simple voice controls only.
