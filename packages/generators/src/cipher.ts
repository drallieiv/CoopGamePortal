import { SeededPRNG } from '@escape-system/contracts';

export interface RuneCipherOptions {
  seed: string;
  message: string;
}

export interface RuneCipherResult {
  seed: string;
  decodedMessage: string;
  encodedMessage: string;
  runeKeyMap: Record<string, string>;
  inscriptionSvg: string;
  rosettaSheetSvg: string;
}

const RUNIC_ALPHABET = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ',
  'ᛁ', 'ᛃ', 'ᛈ', 'ᛇ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ',
  'ᛚ', 'ᛜ', 'ᛟ', 'ᛞ', '𐌸', '𐍈'
];

export function generateRuneCipher(options: RuneCipherOptions): RuneCipherResult {
  const seed = options.seed;
  const decodedMessage = options.message.toUpperCase();
  const rng = new SeededPRNG(`${seed}-cipher`);

  // Shuffle alphabet based on seed
  const shuffledRunes = [...RUNIC_ALPHABET];
  for (let i = shuffledRunes.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [shuffledRunes[i], shuffledRunes[j]] = [shuffledRunes[j], shuffledRunes[i]];
  }

  // Map A-Z to runes
  const runeKeyMap: Record<string, string> = {};
  const latinLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < latinLetters.length; i++) {
    runeKeyMap[latinLetters[i]] = shuffledRunes[i % shuffledRunes.length];
  }

  // Encode message
  let encodedMessage = '';
  for (const char of decodedMessage) {
    if (runeKeyMap[char]) {
      encodedMessage += runeKeyMap[char];
    } else {
      encodedMessage += char;
    }
  }

  // Inscription SVG (The cryptogram found on the wall / clue card)
  const inscriptionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <style>
    .stone { fill: #2b2d42; rx: 8; }
    .rune { font-family: sans-serif; font-size: 32px; fill: #ffd166; letter-spacing: 8px; text-anchor: middle; }
    .label { font-family: monospace; font-size: 11px; fill: #8d99ae; }
  </style>
  <rect width="600" height="200" class="stone" />
  <text x="300" y="110" class="rune">${escapeXml(encodedMessage)}</text>
  <text x="20" y="180" class="label">RUNE CIPHER • SEED: ${escapeXml(seed)}</text>
</svg>`;

  // Rosetta Sheet SVG (The translation reference dictionary for the Translator role)
  let dictRows = '';
  for (let i = 0; i < latinLetters.length; i++) {
    const letter = latinLetters[i];
    const rune = runeKeyMap[letter];
    const col = i % 6;
    const row = Math.floor(i / 6);
    const x = 30 + col * 90;
    const y = 80 + row * 60;

    dictRows += `
      <rect x="${x}" y="${y}" width="75" height="48" fill="#ffffff" stroke="#ced4da" rx="4" />
      <text x="${x + 20}" y="${y + 32}" font-family="serif" font-size="20" font-weight="bold" fill="#1d3557">${letter}</text>
      <text x="${x + 50}" y="${y + 33}" font-family="sans-serif" font-size="22" fill="#e76f51">${rune}</text>`;
  }

  const rosettaSheetSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <style>
    .bg { fill: #f8f9fa; stroke: #adb5bd; }
    .title { font-family: serif; font-size: 20px; font-weight: bold; fill: #1d3557; }
    .sub { font-family: sans-serif; font-size: 12px; fill: #6c757d; }
  </style>
  <rect width="600" height="420" class="bg" rx="6" />
  <text x="30" y="40" class="title">THE TRANSLATOR'S ROSETTA LEDGER</text>
  <text x="30" y="60" class="sub">Confidential translation key for deciphering ancient runic scripts.</text>
  <g id="dict">${dictRows}</g>
</svg>`;

  return {
    seed,
    decodedMessage,
    encodedMessage,
    runeKeyMap,
    inscriptionSvg,
    rosettaSheetSvg
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
