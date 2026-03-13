# LyricFlow

LyricFlow is a frontend-only freestyle rap and lyric writing assistant.

## Tech Stack

- React
- TailwindCSS
- Framer Motion
- Web Audio API
- MediaRecorder API
- Canvas API
- Datamuse API
- Free Dictionary API

## Features

- Multiline lyric editor with live line analysis
- Automatic rhyme highlighting based on Datamuse phonetic rhymes
- Per-line syllable counting
- Lyrics export (`lyrics.txt`)
- Metronome with BPM slider (60-180) and generated click sound
- Canvas beat visualizer pulsing on each beat
- Vocal recording controls: start, stop, play, download (`song.wav`)
- Word assistant with:
  - Perfect rhymes
  - Near rhymes
  - Sound-alike words
  - Same-syllable rhymes
  - Definitions
  - Related words
  - Synonyms
- Custom neon-style favicon

## Run Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

No backend is required.
