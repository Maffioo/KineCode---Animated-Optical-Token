/**
 * Standard CRC-8 Implementation (Polynomial 0x07, Initial 0x00)
 */

const CRC8_TABLE = new Uint8Array(256);

// Precompute CRC-8 table
(function initCRC8Table() {
  const polynomial = 0x07;
  for (let i = 0; i < 256; i++) {
    let curr = i;
    for (let bit = 0; bit < 8; bit++) {
      if ((curr & 0x80) !== 0) {
        curr = ((curr << 1) ^ polynomial) & 0xff;
      } else {
        curr = (curr << 1) & 0xff;
      }
    }
    CRC8_TABLE[i] = curr;
  }
})();

export function computeCRC8(data: Uint8Array | number[]): number {
  let crc = 0x00;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i]!;
    crc = CRC8_TABLE[crc ^ byte]!;
  }
  return crc;
}

export function verifyCRC8(data: Uint8Array | number[], expectedCrc: number): boolean {
  return computeCRC8(data) === expectedCrc;
}
