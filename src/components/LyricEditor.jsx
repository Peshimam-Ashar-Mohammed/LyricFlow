import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react';
import { lineSyllables } from './utils';
import RhymeAnalysisPanel from './RhymeAnalysisPanel';

const FAMILY_COLOR_COUNT = 6;

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractWordTokens(text) {
  return text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || [];
}

function normalizeWordToken(token) {
  return (token || '').toLowerCase().replace(/[-']/g, '').replace(/[^a-z]/g, '');
}

function rhymeSignature(word) {
  const cleaned = normalizeWordToken(word);
  if (!cleaned) {
    return '';
  }

  if (cleaned.endsWith('ing') && cleaned.length >= 4) {
    return cleaned.slice(-4);
  }

  const lastVowelMatch = cleaned.match(/[aeiouy][a-z]*$/);
  const vowelTail = lastVowelMatch ? lastVowelMatch[0] : cleaned.slice(-4);

  if (vowelTail.length > 4) {
    return vowelTail.slice(-4);
  }

  if (vowelTail.length < 3) {
    return cleaned.slice(-3);
  }

  return vowelTail;
}

function getCurrentLineLastWord(text, caretIndex) {
  const safeIndex = Math.max(0, Math.min(caretIndex, text.length));
  const lineStart = text.lastIndexOf('\n', safeIndex - 1) + 1;
  const lineEndIndex = text.indexOf('\n', safeIndex);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const line = text.slice(lineStart, lineEnd);
  const words = extractWordTokens(line);
  return normalizeWordToken(words[words.length - 1] || '');
}

const LyricEditor = forwardRef(function LyricEditor(
  { 
    lyrics, 
    setLyrics, 
    onAutoModeChange, 
    onLiveWordChange, 
    isAutoMode, 
    onAnalyze, 
    rhymeGroups, 
    isAnalyzing 
  },
  ref
) {
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  
  const lines = useMemo(() => lyrics.split('\n'), [lyrics]);
  
  // Build rhyme lookup for overlay
  const rhymeMap = useMemo(() => {
    const map = new Map();
    if (!rhymeGroups || rhymeGroups.length === 0) return map;
    rhymeGroups.forEach((group, index) => {
        group.forEach(word => map.set(normalizeWordToken(word), index % FAMILY_COLOR_COUNT));
    });
    return map;
  }, [rhymeGroups]);

  const emitCurrentLineWord = useCallback(
    (textValue, caretPosition) => {
      const nextWord = getCurrentLineLastWord(textValue, caretPosition);
      onLiveWordChange?.(nextWord);
    },
    [onLiveWordChange]
  );
  
  const syncScroll = () => {
    if (textareaRef.current && overlayRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLyrics(newVal);
    syncScroll();
    emitCurrentLineWord(newVal, e.target.selectionStart);
    
    if (isAutoMode) {
        onAnalyze?.();
    }
  };

  const handleSelect = (e) => {
    emitCurrentLineWord(e.target.value, e.target.selectionStart);
  };

  const insertWordAtCursor = (word) => {
    const editor = textareaRef.current;
    if (!editor || !word) {
      return;
    }

    const start = editor.selectionStart ?? lyrics.length;
    const end = editor.selectionEnd ?? lyrics.length;
    const before = lyrics.slice(0, start);
    const after = lyrics.slice(end);

    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);
    const insertion = `${needsLeadingSpace ? ' ' : ''}${word}${needsTrailingSpace ? ' ' : ''}`;

    const nextText = `${before}${insertion}${after}`;
    const nextCursor = before.length + insertion.length;

    setLyrics(nextText);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      syncScroll();
      emitCurrentLineWord(nextText, nextCursor);
      if (isAutoMode) onAnalyze?.();
    });
  };

  useImperativeHandle(ref, () => ({
    insertWordAtCursor,
    focus: () => textareaRef.current?.focus()
  }));

  const handleDownloadLyrics = () => {
    const blob = new Blob([lyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lyrics.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Generate overlay HTML
  const overlayHtml = useMemo(() => {
    return lines.map(line => {
      // Create HTML line with spans
      const tokens = line.split(/([a-zA-Z']+)/g);
      const highlighted = tokens.map(token => {
         const clean = normalizeWordToken(token);
         if (clean && rhymeMap.has(clean)) {
             const colorIdx = rhymeMap.get(clean);
             return `<span class="rhyme-word rhyme-family-${colorIdx} text-transparent">${escapeHtml(token)}</span>`;
         }
         return `<span>${escapeHtml(token)}</span>`;
      }).join('');
      return `<div class="h-6">${highlighted || '<br/>'}</div>`;
    }).join('');
  }, [lines, rhymeMap]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="section-title text-zinc-500">Editor</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onAutoModeChange?.(!isAutoMode)}
            className={`glow-hover toggle-btn rounded px-2 py-1 text-[10px] uppercase tracking-wide font-bold ${isAutoMode ? 'active bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}
          >
            Auto {isAutoMode ? 'ON' : 'OFF'}
          </button>
          
          {!isAutoMode && (
            <button
                onClick={() => onAnalyze?.()}
                className="glow-hover toggle-btn rounded px-2 py-1 text-[10px] uppercase tracking-wide font-bold bg-zinc-800 text-zinc-400 hover:text-white"
            >
                Check
            </button>
          )}

          <button
            onClick={handleDownloadLyrics}
            className="glow-hover rounded px-2 py-1 text-[10px] uppercase tracking-wide font-bold bg-zinc-900 text-zinc-500 hover:text-zinc-300"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex-1 flex rounded border border-white/5 bg-zinc-950/40 relative group overflow-hidden">
          {/* Line Numbers */}
          <div className="editor-font min-w-[2rem] border-r border-white/5 bg-zinc-900/30 px-2 py-3 text-[10px] text-zinc-700 text-right select-none">
            {lines.map((line, index) => (
              <div key={index} className="flex justify-end gap-1 h-6">
                 <span>{index + 1}</span>
              </div>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden">
             {/* Overlay for highlighting - BEHIND textarea */}
             <div 
                ref={overlayRef}
                className="absolute inset-0 px-4 py-3 editor-font whitespace-pre pointer-events-none text-transparent overflow-hidden z-0"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: overlayHtml }}
             />
             
             {/* Text Area - Transparent background, visible text */}
             <textarea
                ref={textareaRef}
                value={lyrics}
                onChange={handleChange}
                onScroll={syncScroll}
                onSelect={handleSelect}
                spellCheck={false}
                className="absolute inset-0 w-full h-full bg-transparent px-4 py-3 editor-font resize-none outline-none text-zinc-400 caret-white custom-scrollbar overflow-auto z-10"
                placeholder="Start writing..."
                style={{ color: 'rgba(255,255,255,0.9)' }} 
            />
          </div>
        </div>

        {/* Improved Analysis Panel */}
        <RhymeAnalysisPanel 
          rhymeGroups={rhymeGroups || []} 
          loading={isAnalyzing} 
        />
      </div>
    </section>
  );
});

export default LyricEditor;
