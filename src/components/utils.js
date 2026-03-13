export function cleanWord(word) {
  return (word || '').replace(/[^a-zA-Z']/g, '').toLowerCase();
}

export function estimateWordSyllables(word) {
  const cleaned = cleanWord(word);
  if (!cleaned) {
    return 0;
  }

  if (cleaned.length <= 3) {
    return 1;
  }

  const withoutSilentE = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  const syllableGroups = withoutSilentE.match(/[aeiouy]{1,2}/g);
  return Math.max(1, syllableGroups ? syllableGroups.length : 1);
}

export function lineSyllables(line) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, token) => sum + estimateWordSyllables(token), 0);
}

export function splitLineWithEnding(line) {
  const match = line.match(/^(.*?)([a-zA-Z']+)([^a-zA-Z']*)$/);
  if (!match) {
    return { prefix: line, ending: '', suffix: '' };
  }

  return {
    prefix: match[1],
    ending: match[2],
    suffix: match[3]
  };
}

export function uniqueByWord(items) {
  const seen = new Set();
  const result = [];

  for (const item of items || []) {
    if (!item?.word) {
      continue;
    }

    const key = item.word.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}
