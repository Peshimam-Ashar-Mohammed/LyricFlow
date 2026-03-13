import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cleanWord, uniqueByWord } from './utils';

function WordList({ title, items, color, onWordHover, onWordInsert }) {
  return (
    <div className="rounded-md border border-white/10 bg-zinc-900/55 p-2">
      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-[0.14em] ${color}`}>{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">No results</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.word}
              className="assist-chip"
              onMouseEnter={() => onWordHover?.(item.word)}
              onMouseLeave={() => onWordHover?.('')}
              onClick={() => onWordInsert?.(item.word)}
            >
              {item.word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const RHYME_TABS = [
  { id: 'perfect', label: 'Rhymes' },
  { id: 'near', label: 'Near' },
  { id: 'sound', label: 'Sound' },
  { id: 'syllable', label: 'Syllable' }
];

function WordAssistant({ onWordHover, onWordInsert, liveWord = '', autoMode = false }) {
  const [word, setWord] = useState('night');
  const [query, setQuery] = useState('night');
  const [activeTab, setActiveTab] = useState('perfect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [perfectRhymes, setPerfectRhymes] = useState([]);
  const [nearRhymes, setNearRhymes] = useState([]);
  const [soundSimilar, setSoundSimilar] = useState([]);
  const [sameSyllableRhymes, setSameSyllableRhymes] = useState([]);

  const [definitions, setDefinitions] = useState([]);
  const [relatedWords, setRelatedWords] = useState([]);
  const [synonyms, setSynonyms] = useState([]);

  useEffect(() => {
    const cleaned = cleanWord(query);
    if (!cleaned) {
      return;
    }

    let cancelled = false;

    const fetchWordData = async () => {
      setLoading(true);
      setError('');

      try {
        const [perfectRes, nearRes, soundRes, relatedRes, dictionaryRes, targetSyllablesRes] = await Promise.all([
          fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(cleaned)}&md=s&max=30`),
          fetch(`https://api.datamuse.com/words?rel_nry=${encodeURIComponent(cleaned)}&md=s&max=30`),
          fetch(`https://api.datamuse.com/words?sl=${encodeURIComponent(cleaned)}&md=s&max=30`),
          fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(cleaned)}&max=30`),
          fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`),
          fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(cleaned)}&md=s&max=1`)
        ]);

        const perfectData = perfectRes.ok ? await perfectRes.json() : [];
        const nearData = nearRes.ok ? await nearRes.json() : [];
        const soundData = soundRes.ok ? await soundRes.json() : [];
        const relatedData = relatedRes.ok ? await relatedRes.json() : [];
        const targetSyllablesData = targetSyllablesRes.ok ? await targetSyllablesRes.json() : [];
        const dictionaryData = dictionaryRes.ok ? await dictionaryRes.json() : [];

        if (cancelled) {
          return;
        }

        const targetSyllables = targetSyllablesData[0]?.numSyllables;

        const perfect = uniqueByWord(perfectData).slice(0, 30);
        const near = uniqueByWord(nearData).slice(0, 30);
        const sound = uniqueByWord(soundData).slice(0, 30);
        const related = uniqueByWord(relatedData).slice(0, 30);

        const sameSyllables = targetSyllables
          ? perfect.filter((item) => item.numSyllables === targetSyllables).slice(0, 30)
          : [];

        const entry = Array.isArray(dictionaryData) ? dictionaryData[0] : null;
        const allDefinitions = [];
        const allSynonyms = [];

        (entry?.meanings || []).forEach((meaning) => {
          (meaning.definitions || []).forEach((definition) => {
            if (definition.definition) {
              allDefinitions.push(definition.definition);
            }
            if (Array.isArray(definition.synonyms)) {
              allSynonyms.push(...definition.synonyms);
            }
          });

          if (Array.isArray(meaning.synonyms)) {
            allSynonyms.push(...meaning.synonyms);
          }
        });

        const synonymItems = [...new Set(allSynonyms.map((s) => s.toLowerCase()))]
          .slice(0, 30)
          .map((item) => ({ word: item }));

        setPerfectRhymes(perfect);
        setNearRhymes(near);
        setSoundSimilar(sound);
        setSameSyllableRhymes(sameSyllables);
        setRelatedWords(related);
        setDefinitions(allDefinitions.slice(0, 8));
        setSynonyms(synonymItems);
      } catch {
        if (!cancelled) {
          setError('Failed to fetch word data. Check your connection and try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchWordData();

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    if (!autoMode) {
      return;
    }

    const cleanedLiveWord = cleanWord(liveWord);
    if (!cleanedLiveWord || cleanedLiveWord === query) {
      return;
    }

    setWord(cleanedLiveWord);
    setQuery(cleanedLiveWord);
  }, [autoMode, liveWord, query]);

  const helperStats = useMemo(
    () => ({
      rhymes: perfectRhymes.length + nearRhymes.length,
      definitions: definitions.length
    }),
    [definitions.length, nearRhymes.length, perfectRhymes.length]
  );

  const submitWord = (event) => {
    event.preventDefault();
    setQuery(word);
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Word Assistant</h2>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]">
            <span className={`rounded px-1.5 py-0.5 ${autoMode ? 'bg-sky-500/20 text-sky-200' : 'bg-zinc-700/50 text-zinc-400'}`}>
              Auto {autoMode ? 'On' : 'Off'}
            </span>
            <span className="text-zinc-400">{helperStats.rhymes} rhyme hits</span>
          </div>
        </div>

        <form onSubmit={submitWord} className="flex gap-2">
          <input
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="Enter word"
            className="w-full rounded-md border border-cyan-400/30 bg-zinc-950/80 px-3 py-2 text-base font-medium text-zinc-100 outline-none focus:border-cyan-300"
          />
          <button type="submit" className="glow-hover rounded-md border border-fuchsia-400/40 bg-zinc-800/80 px-3 text-base font-semibold text-fuchsia-100">
            Search
          </button>
        </form>

        {loading ? <p className="mt-2 animate-pulse text-xs text-cyan-300">Loading word data...</p> : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-zinc-900/45 p-3">
        <h3 className="mb-2 section-title">Rhymes</h3>
        <div className="mb-2 flex flex-wrap gap-1">
          {RHYME_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded px-2 py-1 text-xs ${activeTab === tab.id ? 'bg-zinc-700 text-white' : 'bg-zinc-800/70 text-zinc-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'perfect' ? (
          <WordList title="Perfect Rhymes" items={perfectRhymes} color="text-cyan-200" onWordHover={onWordHover} onWordInsert={onWordInsert} />
        ) : null}
        {activeTab === 'near' ? (
          <WordList title="Near Rhymes" items={nearRhymes} color="text-fuchsia-200" onWordHover={onWordHover} onWordInsert={onWordInsert} />
        ) : null}
        {activeTab === 'sound' ? (
          <WordList title="Sound-alike Words" items={soundSimilar} color="text-violet-200" onWordHover={onWordHover} onWordInsert={onWordInsert} />
        ) : null}
        {activeTab === 'syllable' ? (
          <WordList
            title="Same-syllable Rhymes"
            items={sameSyllableRhymes}
            color="text-blue-200"
            onWordHover={onWordHover}
            onWordInsert={onWordInsert}
          />
        ) : null}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-zinc-900/45 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="section-title">Word Helper</h3>
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">{helperStats.definitions} defs</span>
        </div>

        <div className="space-y-2">
          <div className="rounded-md border border-white/10 bg-zinc-900/55 p-2">
            <h4 className="mb-1 text-xs uppercase tracking-[0.14em] text-cyan-200">Definitions</h4>
            {definitions.length === 0 ? (
              <p className="text-xs text-zinc-500">No definitions found.</p>
            ) : (
              <ul className="space-y-1 text-xs text-zinc-200">
                {definitions.map((definition, idx) => (
                  <li key={`${definition}-${idx}`} className="rounded bg-zinc-800/50 px-2 py-1">{definition}</li>
                ))}
              </ul>
            )}
          </div>

          <WordList title="Related Words" items={relatedWords} color="text-fuchsia-200" onWordHover={onWordHover} onWordInsert={onWordInsert} />
          <WordList title="Synonyms" items={synonyms} color="text-blue-200" onWordHover={onWordHover} onWordInsert={onWordInsert} />
        </div>
      </motion.div>
    </section>
  );
}

export default WordAssistant;
