import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import LyricEditor from './components/LyricEditor';
import TransportBar from './components/TransportBar';
import WordAssistant from './components/WordAssistant';
import { useRhymeDetector } from './hooks/useRhymeDetector';

function App() {
  const [lyrics, setLyrics] = useState('I walk through the NIGHT\nTrying to win the FIGHT');
  const [focusWords, setFocusWords] = useState([]);
  const [isEditorAutoMode, setIsEditorAutoMode] = useState(false);
  const [liveAssistWord, setLiveAssistWord] = useState('');
  const [beatSignal, setBeatSignal] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef(null);
  const editorRef = useRef(null);
  
  const { rhymeGroups, isAnalyzing, analyze } = useRhymeDetector(lyrics, isEditorAutoMode);

  const stats = useMemo(() => {
    const lines = lyrics.split('\n').filter((line) => line.trim().length > 0);
    const words = lyrics
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    return {
      lines: lines.length,
      words: words.length
    };
  }, [lyrics]);

  const insertWord = (word) => {
    if (!word) {
      return;
    }

    if (editorRef.current?.insertWordAtCursor) {
      editorRef.current.insertWordAtCursor(word);
      return;
    }

    setLyrics((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') || prev.length === 0 ? '' : ' '}${word}`);
  };

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMove = (event) => {
      const container = splitContainerRef.current;
      if (!container) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      const pointerX = event.clientX;
      const widthPercent = ((pointerX - bounds.left) / bounds.width) * 100;
      const nextWidth = Math.min(75, Math.max(45, widthPercent));
      setLeftPanelWidth(nextWidth);
    };

    const stopDragging = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDragging);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [isDragging]);

  return (
    <main className="h-screen p-3 sm:p-4 overflow-hidden">
      <div className="mx-auto flex h-full max-w-[1700px] min-h-0 flex-col gap-3">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <h1 className="font-['Bebas_Neue'] text-3xl tracking-[0.1em] text-white">LyricFlow</h1>
            <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-500 border-l border-white/10 pl-2">
              BETA
            </span>
          </div>

          <div className="flex gap-2 text-[10px] sm:text-xs font-mono text-zinc-500">
            <div className="px-2">L: {stats.lines}</div>
            <div className="px-2 border-l border-zinc-800">W: {stats.words}</div>
          </div>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-0 flex-1 flex-col gap-3">
          <div ref={splitContainerRef} className="panel flex min-h-0 flex-1 rounded-lg">
            <div style={{ width: `${leftPanelWidth}%` }} className="min-h-0 min-w-[45%] p-3">
              <div className={`h-full min-h-0 ${beatSignal % 2 === 0 ? 'beat-border' : ''}`}>
                <LyricEditor
                  ref={editorRef}
                  lyrics={lyrics}
                  setLyrics={setLyrics}
                  focusWords={focusWords} // Kept for future, though highlightedLines logic removed this
                  onAutoModeChange={setIsEditorAutoMode}
                  onLiveWordChange={setLiveAssistWord}
                  isAutoMode={isEditorAutoMode}
                  rhymeGroups={rhymeGroups}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={analyze}
                />
              </div>
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={() => setIsDragging(true)}
              className="w-1 cursor-col-resize hover:bg-zinc-700/50 transition-colors bg-black/20"
            />

            <div className="flex min-h-0 flex-1 min-w-[22%] bg-zinc-950/30 p-3">
              <WordAssistant
                onWordHover={(nextWord) => setFocusWords(nextWord ? [nextWord] : [])}
                onWordInsert={insertWord}
                liveWord={liveAssistWord}
                autoMode={isEditorAutoMode}
              />
            </div>
          </div>

          <TransportBar onBeat={setBeatSignal} />
        </motion.section>
      </div>
    </main>
  );
}

export default App;
