export interface MorseCodeOptions {
  seed: string;
  message: string;
}

export interface MorseCodeOutput {
  plaintext: string;
  morseText: string;
  tapeSvg: string;
  referenceCardSvg: string;
}

const MORSE_TABLE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.'
};

export function generateMorseCode(options: MorseCodeOptions): MorseCodeOutput {
  const cleanMessage = options.message.toUpperCase();
  const tokens: string[] = [];

  for (let i = 0; i < cleanMessage.length; i++) {
    const char = cleanMessage[i];
    if (char === ' ') {
      tokens.push('/');
    } else if (MORSE_TABLE[char]) {
      tokens.push(MORSE_TABLE[char]);
    }
  }

  const morseText = tokens.join(' ');

  // Punched Telegraph Tape SVG
  const tapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160">
  <rect x="10" y="10" width="580" height="140" rx="8" fill="#fdf0d5" stroke="#780000" stroke-width="3"/>
  <rect x="20" y="20" width="560" height="120" rx="4" fill="none" stroke="#c1121f" stroke-dasharray="8 4"/>
  <text x="300" y="48" fill="#003049" font-size="14" font-weight="bold" font-family="monospace" text-anchor="middle">TELEGRAPH TRANSMISSION TAPE</text>
  <rect x="30" y="65" width="540" height="45" rx="4" fill="#669bbc" opacity="0.15"/>
  <text x="300" y="94" fill="#780000" font-size="18" font-family="monospace" font-weight="bold" letter-spacing="3" text-anchor="middle">${morseText}</text>
  <text x="300" y="130" fill="#003049" font-size="11" font-family="monospace" text-anchor="middle">SIGNAL SEED: ${options.seed}</text>
</svg>`;

  // Morse Reference Ledger Sheet SVG
  const referenceCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">
  <rect x="10" y="10" width="400" height="280" rx="8" fill="#ffffff" stroke="#003049" stroke-width="2"/>
  <rect x="10" y="10" width="400" height="34" fill="#003049"/>
  <text x="210" y="32" fill="#ffffff" font-size="13" font-weight="bold" font-family="sans-serif" text-anchor="middle">INTERNATIONAL MORSE CODE REFERENCE</text>
  <g transform="translate(30, 70)" font-family="monospace" font-size="12" fill="#333333">
    <text x="0" y="0">A: .-</text><text x="80" y="0">B: -...</text><text x="170" y="0">C: -.-.</text><text x="260" y="0">D: -..</text>
    <text x="0" y="25">E: .</text><text x="80" y="25">F: ..-.</text><text x="170" y="25">G: --.</text><text x="260" y="25">H: ....</text>
    <text x="0" y="50">I: ..</text><text x="80" y="50">J: .---</text><text x="170" y="50">K: -.-</text><text x="260" y="50">L: .-..</text>
    <text x="0" y="75">M: --</text><text x="80" y="75">N: -.</text><text x="170" y="75">O: ---</text><text x="260" y="75">P: .--.</text>
    <text x="0" y="100">Q: --.-</text><text x="80" y="100">R: .-.</text><text x="170" y="100">S: ...</text><text x="260" y="100">T: -</text>
    <text x="0" y="125">U: ..-</text><text x="80" y="125">V: ...-</text><text x="170" y="125">W: .--</text><text x="260" y="125">X: -..-</text>
    <text x="0" y="150">Y: -.--</text><text x="80" y="150">Z: --..</text><text x="170" y="150">0-9: .----</text>
  </g>
</svg>`;

  return {
    plaintext: cleanMessage,
    morseText,
    tapeSvg,
    referenceCardSvg
  };
}
