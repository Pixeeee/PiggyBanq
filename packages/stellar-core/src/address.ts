const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function isValidStellarPublicKey(value: string): boolean {
  if (!/^G[A-Z2-7]{55}$/.test(value)) {
    return false;
  }

  const decoded = decodeBase32(value);
  if (decoded.length !== 35) {
    return false;
  }

  const versionByte = decoded[0];
  const payload = decoded.slice(0, 33);
  const checksum = decoded[33] | (decoded[34] << 8);

  return versionByte === 48 && crc16Xmodem(payload) === checksum;
}

export function maskStellarAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-5)}`;
}

function decodeBase32(value: string): number[] {
  let bits = 0;
  let bitCount = 0;
  const output: number[] = [];

  for (const char of value) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`invalid base32 character: ${char}`);
    }

    bits = (bits << 5) | index;
    bitCount += 5;

    while (bitCount >= 8) {
      output.push((bits >> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }

  return output;
}

function crc16Xmodem(bytes: number[]): number {
  let crc = 0x0000;

  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc;
}

