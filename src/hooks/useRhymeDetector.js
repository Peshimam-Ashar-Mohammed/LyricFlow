import { useState, useCallback, useRef, useEffect } from 'react';
import { cleanWord } from '../components/utils';

export function useRhymeDetector(lyrics, autoMode = false) {
  const [rhymeGroups, setRhymeGroups] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cacheRef = useRef(new Map());
  const mounted = useRef(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const analyze = useCallback(async (textToAnalyze = lyrics) => {
    if (!textToAnalyze) {
        setRhymeGroups([]);
        return;
    }
    
    setIsAnalyzing(true);
    
    // simple tokenization
    const rawWords = textToAnalyze.match(/[a-zA-Z']+/g) || [];
    const uniqueWords = [...new Set(rawWords.map(w => cleanWord(w)))].filter(w => w.length > 1);

    // Identify words needing API call
    const toFetch = uniqueWords.filter(w => !cacheRef.current.has(w));
    
    // Fetch in batches (concurrently but limited)
    const BATCH_SIZE = 5;
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
        const batch = toFetch.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (word) => {
            try {
                // Fetch perfect rhymes
                const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}&max=100`);
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                const rhymeSet = new Set(data.map(item => item.word));
                // Add the word itself for easier comparison logic later? No, strict rhyme.
                cacheRef.current.set(word, rhymeSet);
            } catch (error) {
                console.error('Rhyme fetch failed for', word, error);
                cacheRef.current.set(word, new Set());
            }
        }));
        if (!mounted.current) return;
    }

    // Build Adjacency List (Graph)
    const adjacency = new Map();
    uniqueWords.forEach(w => adjacency.set(w, []));

    // N^2 check (fast enough for typical lyric length < 1000 words)
    // Optimization: avoid double checking pairs
    for (let i = 0; i < uniqueWords.length; i++) {
        for (let j = i + 1; j < uniqueWords.length; j++) {
            const w1 = uniqueWords[i];
            const w2 = uniqueWords[j];
            
            const rhymes1 = cacheRef.current.get(w1);
            const rhymes2 = cacheRef.current.get(w2);

            // If w2 is in w1's rhyme list OR w1 is in w2's rhyme list
            // (Datamuse handles symmetry well, but good to check both)
            if ((rhymes1 && rhymes1.has(w2)) || (rhymes2 && rhymes2.has(w1))) {
                adjacency.get(w1).push(w2);
                adjacency.get(w2).push(w1);
            }
        }
    }

    // Find Connected Components (Rhyme Families)
    const visited = new Set();
    const families = [];

    for (const word of uniqueWords) {
        if (!visited.has(word)) {
            const component = [];
            const queue = [word];
            visited.add(word);
            
            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);
                const neighbors = adjacency.get(current) || [];
                
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }

            if (component.length >= 2) {
                families.push(component);
            }
        }
    }

    // Sort families by occurrence (first word index) or size?
    // Let's sort by first appearance in text to keep colors stable-ish
    // But uniqueWords order is arbitrary (Set iteration order). 
    // Let's map back to first index in original text.
    
    // 1. Find first index of each word in raw text
    const firstIndexMap = new Map();
    let scanPos = 0;
    // rough scan
    const normalizedTokens = (lyrics.match(/[a-zA-Z']+/g) || []).map(cleanWord);
    normalizedTokens.forEach((w, idx) => {
        if (!firstIndexMap.has(w)) firstIndexMap.set(w, idx);
    });

    families.sort((a, b) => {
        const idxA = Math.min(...a.map(w => firstIndexMap.get(w) ?? Infinity));
        const idxB = Math.min(...b.map(w => firstIndexMap.get(w) ?? Infinity));
        return idxA - idxB;
    });

    if (mounted.current) {
        setRhymeGroups(families);
        setIsAnalyzing(false);
    }
  }, [lyrics]); // Keep lyrics dep for default value, but argument overrides

  // Auto-analyze debounced effect
  useEffect(() => {
    if (!autoMode) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
        analyze(lyrics);
    }, 1000);
    return () => clearTimeout(timeoutRef.current);
  }, [lyrics, autoMode, analyze]);

  return { rhymeGroups, isAnalyzing, analyze };
}
