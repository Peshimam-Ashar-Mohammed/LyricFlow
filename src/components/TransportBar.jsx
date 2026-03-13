import { useCallback, useEffect, useRef, useState } from 'react';
import BeatVisualizer from './BeatVisualizer';

function TransportBar({ onBeat }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingError, setRecordingError] = useState('');

  const [bpm, setBpm] = useState(96);
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [beatPulse, setBeatPulse] = useState(0);

  const [beatUrl, setBeatUrl] = useState('');
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const beatAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }

      if (beatUrl) {
        URL.revokeObjectURL(beatUrl);
      }
    };
  }, [beatUrl, recordingUrl]);

  const tickMetronome = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.value = 1450;

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.07);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);

    setBeatPulse((prev) => {
      const next = (prev + 1) % 1000;
      onBeat?.(next);
      return next;
    });
  }, [onBeat]);

  useEffect(() => {
    if (!isMetronomeRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return undefined;
    }

    tickMetronome();
    timerRef.current = setInterval(tickMetronome, Math.round((60 / bpm) * 1000));

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [bpm, isMetronomeRunning, tickMetronome]);

  const startRecording = async () => {
    try {
      setRecordingError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setRecordingUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return url;
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setRecordingError('Microphone access failed. Please allow microphone permission.');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') {
      return;
    }

    recorderRef.current.stop();
    setIsRecording(false);
  };

  const playRecording = () => {
    if (!recordingUrl) {
      return;
    }

    const audio = new Audio(recordingUrl);
    void audio.play();
  };

  const downloadRecording = () => {
    if (!recordingUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = recordingUrl;
    anchor.download = 'song.wav';
    anchor.click();
  };

  const toggleBeatPlayback = () => {
    const audio = beatAudioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
      setIsBeatPlaying(true);
    } else {
      audio.pause();
      setIsBeatPlaying(false);
    }
  };

  return (
    <section className="panel shrink-0 rounded-lg p-2 flex items-center gap-3 overflow-hidden">
        {/* Controls Group */}
        <div className="flex items-center gap-1">
            <button onClick={isRecording ? stopRecording : startRecording} className={`glow-hover w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-zinc-800 text-rose-500 hover:bg-zinc-700'}`}>
                {isRecording ? <span className="w-2.5 h-2.5 bg-current rounded-sm"/> : <span className="w-2.5 h-2.5 bg-current rounded-full"/>}
            </button>
            <button onClick={playRecording} disabled={!recordingUrl} className="glow-hover w-8 h-8 rounded-full bg-zinc-800 text-emerald-500 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 translate-x-0.5"><path d="M8 5v14l11-7z"/></svg>
            </button>
             <button onClick={downloadRecording} disabled={!recordingUrl} className="glow-hover w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
        </div>

        <div className="h-6 w-px bg-white/5 mx-1"></div>

        {/* BPM / Metronome */}
        <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 w-24">
                 <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                    <span>BPM</span>
                    <span>{bpm}</span>
                 </div>
                 <input
                    type="range"
                    min="60"
                    max="180"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
                 />
            </div>
            <button
                onClick={() => setIsMetronomeRunning(p => !p)}
                className={`glow-hover ml-1 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border transition-all ${isMetronomeRunning ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'}`}
            >
                METRO
            </button>
        </div>

        <div className="h-6 w-px bg-white/5 mx-1"></div>

        {/* Beat Upload/Play */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
             <label className="glow-hover cursor-pointer px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-400 hover:text-white whitespace-nowrap">
                Upload Beat
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if(!file) return;
                    const url = URL.createObjectURL(file);
                    if(beatUrl) URL.revokeObjectURL(beatUrl);
                    setBeatUrl(url);
                    setIsBeatPlaying(false);
                }}/>
             </label>
             
             {beatUrl && (
                <button onClick={toggleBeatPlayback} className="glow-hover w-6 h-6 rounded-full bg-zinc-800 text-indigo-400 hover:bg-zinc-700 flex items-center justify-center shrink-0">
                    {isBeatPlaying ? (
                       <span className="w-2 h-2 bg-current rounded-sm"/>
                    ) : (
                       <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 translate-x-0.5"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
             )}
             
             {/* Visualizer inside transport now */}
             <div className="flex-1 h-6 bg-zinc-950/50 rounded-md overflow-hidden relative opacity-50">
                 <BeatVisualizer beatPulse={beatPulse} heightClass="h-full" />
             </div>
        </div>

      {beatUrl && (
        <audio
          ref={beatAudioRef}
          src={beatUrl}
          preload="auto"
          onPause={() => setIsBeatPlaying(false)}
          onEnded={() => setIsBeatPlaying(false)}
          onPlay={() => setIsBeatPlaying(true)}
          className="hidden"
        />
      )}
    </section>
  );
}

export default TransportBar;
