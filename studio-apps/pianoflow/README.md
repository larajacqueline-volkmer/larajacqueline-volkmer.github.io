# PianoFlow AI

PianoFlow AI is a browser-first visual piano trainer built from the approved dark neon mockup.

## No setup
- No Python
- No backend
- No account
- No payment system
- No external runtime dependencies
- Works as a static site on GitHub Pages

## Start locally
Open `index.html` in a modern browser.

For the best PWA/offline behavior, publish the folder with GitHub Pages or any static HTTPS host.

## Main features
- Large interactive piano with German note names C–H
- Mouse/touch and computer-keyboard input
- Synthesized piano sound via Web Audio API
- Demo-song playback with synchronized falling notes
- Play/pause, seek, tempo and volume controls
- Loop section, note visibility and AI guidance toggles
- Guided practice that waits for the correct key and records hits, misses and reaction time
- Ear-training challenge
- Song search, genre filters and favorites
- Own audio files via file picker or drag & drop
- Browser-local audio playback
- Browser-local pitch analysis using a Web Worker
- Editable note sequence
- JSON and MIDI export
- Local statistics and preferences
- IndexedDB persistence for imported audio files
- PWA manifest + service worker

## Audio analysis note
The browser-only analyzer is intentionally lightweight and runs locally. It is suitable for testing melody extraction from many single-line or melody-focused piano recordings, but it is not a replacement for a production-grade polyphonic audio-to-MIDI model. Results depend on the recording, polyphony, noise and browser codec support.

## GitHub Pages
Upload the contents of this folder to a repository and enable:
`Settings → Pages → Deploy from a branch → main → / (root)`.

## Privacy
Audio analysis and imported audio stay in the browser. See `PRIVACY.md`.
