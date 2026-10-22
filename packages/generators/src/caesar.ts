import { SeededPRNG } from '@escape-system/contracts';

export interface CaesarCipherOptions {
  seed: string;
  message: string;
  shift?: number;
}

export interface CaesarCipherOutput {
  plaintext: string;
  ciphertext: string;
  shift: number;
  visualSvg: string;
  wheelSvg: string;
}

export function generateCaesarCipher(options: CaesarCipherOptions): CaesarCipherOutput {
  const rng = new SeededPRNG(`${options.seed}-caesar`);
  const shift = options.shift !== undefined ? ((options.shift % 26) + 26) % 26 : rng.nextInt(1, 25);

  const cleanMessage = options.message.toUpperCase();
  let ciphertext = '';

  for (let i = 0; i < cleanMessage.length; i++) {
    const charCode = cleanMessage.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      const encrypted = String.fromCharCode(((charCode - 65 + shift) % 26) + 65);
      ciphertext += encrypted;
    } else {
      ciphertext += cleanMessage[i];
    }
  }

  // Encrypted Inscription Parchment SVG
  const visualSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 240">
  <rect x="10" y="10" width="480" height="220" rx="12" fill="#fdf6e2" stroke="#d4a373" stroke-width="4"/>
  <rect x="20" y="20" width="460" height="200" rx="8" fill="none" stroke="#faedcd" stroke-width="2"/>
  <text x="250" y="55" fill="#7f4f24" font-size="16" font-family="serif" font-weight="bold" text-anchor="middle">ENCRYPTED CAESAR INSCRIPTION</text>
  <text x="250" y="85" fill="#a68a64" font-size="11" font-family="sans-serif" text-anchor="middle">ROTATIONAL CIPHER ARTIFACT</text>
  <rect x="40" y="110" width="420" height="65" rx="6" fill="#faedcd" stroke="#d4a373" stroke-width="1.5"/>
  <text x="250" y="152" fill="#582f0e" font-size="20" font-family="monospace" font-weight="bold" letter-spacing="4" text-anchor="middle">${ciphertext}</text>
  <text x="250" y="205" fill="#7f4f24" font-size="11" font-family="monospace" text-anchor="middle">SEED: ${options.seed}</text>
</svg>`;

  // Cipher Decoder Wheel SVG (inner ring shifted by shift)
  const wheelSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">
  <circle cx="180" cy="180" r="160" fill="#fefae0" stroke="#bc6c25" stroke-width="4"/>
  <circle cx="180" cy="180" r="110" fill="#dda15e" stroke="#283618" stroke-width="3"/>
  <circle cx="180" cy="180" r="60" fill="#606c38"/>
  <text x="180" y="175" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">DECODER</text>
  <text x="180" y="195" fill="#fefae0" font-size="12" font-weight="bold" text-anchor="middle" font-family="monospace">ROT +${shift}</text>
  <!-- Outer Ring Sample Letters -->
  <text x="180" y="45" fill="#283618" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">A</text>
  <text x="315" y="185" fill="#283618" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">M</text>
  <text x="180" y="325" fill="#283618" font-size="14" font-weight="bold" text-anchor="middle" font-family="monospace">Z</text>
  <!-- Inner Ring Sample Letters -->
  <text x="180" y="95" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle" font-family="monospace">${String.fromCharCode(((0 + shift) % 26) + 65)}</text>
</svg>`;

  return {
    plaintext: cleanMessage,
    ciphertext,
    shift,
    visualSvg,
    wheelSvg
  };
}
