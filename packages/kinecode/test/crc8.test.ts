import { describe, it, expect } from 'vitest';
import { computeCRC8, verifyCRC8 } from '../src/core/crc8.ts';

describe('CRC-8', () => {
  it('should compute consistent checksums', () => {
    const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const crc = computeCRC8(data);
    expect(typeof crc).toBe('number');
    expect(crc).toBeGreaterThanOrEqual(0);
    expect(crc).toBeLessThanOrEqual(255);
    expect(verifyCRC8(data, crc)).toBe(true);
  });

  it('should detect byte corruption', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    const crc = computeCRC8(data);

    const corrupted = new Uint8Array(data);
    corrupted[2] = 99; // Corrupt single byte

    expect(verifyCRC8(corrupted, crc)).toBe(false);
  });
});
