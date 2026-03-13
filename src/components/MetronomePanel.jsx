import { useCallback, useEffect, useRef, useState } from 'react';
import BeatVisualizer from './BeatVisualizer';

function MetronomePanel({ onBeat }) {
  const [bpm, setBpm] = useState(96);
  const [isRunning, setIsRunning] = useState(false);
  const [beatPulse, setBeatPulse] = useState(0);
  const [beatUrl, setBeatUrl] = useState('');
  const beatAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);

  const click = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 1600;

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.07);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);

    setBeatPulse((prev) => {
      const next = (prev + 1) % 1000;
      if (onBeat) {
        onBeat(next);
      }
      return next;
    });

    if (beatAudioRef.current && !beatAudioRef.current.paused) {
      beatAudioRef.current.currentTime = 0;
      void beatAudioRef.current.play();
    }
  }, [onBeat]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }

    click();
    const interval = Math.round((60 / bpm) * 1000);
    timerRef.current = setInterval(click, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [bpm, click, isRunning]);

  return (
    <section className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/45 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Transport</h2>
        <span className="rounded border border-white/15 px-2 py-1 text-xs text-slate-200">BPM {bpm}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setIsRunning(true)} className="transport-btn glow-hover">Start</button>
        <button onClick={() => setIsRunning(false)} className="transport-btn glow-hover">Stop</button>

        <label className="ml-auto text-xs text-slate-300" htmlFor="beat-upload">
          Beat
        </label>
        <input
          id="beat-upload"
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            const url = URL.createObjectURL(file);
            setBeatUrl((prev) => {
              if (prev) {
                URL.revokeObjectURL(prev);
              }
              return url;
            });
          }}
          className="max-w-[160px] text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-xs file:text-white"
        />
      </div>

      <input
        type="range"
        min="60"
        max="180"
        value={bpm}
        className="range-neon w-full"
        onChange={(event) => setBpm(Number(event.target.value))}
      />

      {beatUrl ? <audio ref={beatAudioRef} src={beatUrl} preload="auto" /> : null}
      <BeatVisualizer beatPulse={beatPulse} heightClass="h-14" />
    </section>
  );
}

export default MetronomePanel;
