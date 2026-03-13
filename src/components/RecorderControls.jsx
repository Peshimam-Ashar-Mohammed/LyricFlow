import { useRef, useState } from 'react';

function RecorderControls() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const nextUrl = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return nextUrl;
        });

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setErrorMessage('Microphone access failed. Please allow microphone permission.');
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
    if (!audioUrl) {
      return;
    }

    const audio = new Audio(audioUrl);
    audio.play();
  };

  const downloadRecording = () => {
    if (!audioUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = 'song.wav';
    anchor.click();
  };

  return (
    <section className="space-y-2 rounded-lg border border-white/10 bg-zinc-900/45 p-3">
      <h2 className="section-title">Recording</h2>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="transport-btn glow-hover disabled:cursor-not-allowed"
        >
          <span className={`${isRecording ? 'active-pulse' : ''}`}>●</span> Record
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="transport-btn glow-hover disabled:cursor-not-allowed"
        >
          ■ Stop
        </button>
        <button
          onClick={playRecording}
          disabled={!audioUrl}
          className="transport-btn glow-hover disabled:cursor-not-allowed"
        >
          ▶ Play
        </button>
        <button
          onClick={downloadRecording}
          disabled={!audioUrl}
          className="transport-btn glow-hover disabled:cursor-not-allowed"
        >
          ⬇ Download
        </button>
      </div>

      {isRecording ? (
        <p className="text-xs uppercase tracking-[0.12em] text-rose-300 active-pulse">Recording in progress</p>
      ) : (
        <p className="text-xs text-zinc-400">Recorded audio is kept in-memory and available for playback/download.</p>
      )}

      {errorMessage ? <p className="text-xs text-rose-300">{errorMessage}</p> : null}
    </section>
  );
}

export default RecorderControls;
