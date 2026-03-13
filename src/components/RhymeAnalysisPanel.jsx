import React from 'react';

const FAMILY_COLORS = [
  'text-cyan-400',
  'text-pink-400',
  'text-lime-400',
  'text-amber-400',
  'text-violet-400',
  'text-rose-400'
];

export default function RhymeAnalysisPanel({ rhymeGroups, loading, analyze }) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-950/70 border border-white/10 rounded-lg min-h-[120px]">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="uppercase tracking-wider font-semibold text-[10px]">Rhyme Families</span>
        {loading ? (
          <span className="animate-pulse text-sky-400 text-[10px]">analyzing...</span>
        ) : (
          <span className="text-[10px]">{rhymeGroups.length} families detected</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {rhymeGroups.length === 0 ? (
          <div className="text-xs text-zinc-600 italic py-2">
            Write some lyrics to see rhyme groups here...
          </div>
        ) : (
          rhymeGroups.map((group, index) => {
            const colorClass = FAMILY_COLORS[index % FAMILY_COLORS.length];
            return (
              <div key={index} className="flex flex-wrap gap-1.5 items-center bg-zinc-900/40 p-2 rounded border border-white/5">
                <span className={`text-[10px] font-bold opacity-50 w-4 ${colorClass}`}>
                  #{index + 1}
                </span>
                {group.map((word) => (
                  <span 
                    key={`${index}-${word}`} 
                    className={`text-xs px-1.5 py-0.5 rounded bg-white/5 ${colorClass}`}
                  >
                    {word}
                  </span>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
