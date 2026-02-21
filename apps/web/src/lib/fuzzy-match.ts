export const FUZZY_THRESHOLD = 0.45;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  const s = str.toLowerCase();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.substring(i, i + 2));
  }
  return bigrams;
}

export function diceCoefficient(a: string, b: string): number {
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersectionSize = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersectionSize++;
  }

  return (2 * intersectionSize) / (bigramsA.size + bigramsB.size);
}
