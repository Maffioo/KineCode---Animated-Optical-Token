import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  packMessageHeader,
  unpackMessageHeader,
  computeTruncatedHmac,
  verifyTruncatedHmac,
  computeEd25519Truncated
} from '../src/core/crypto.ts';

describe('Crypto & Token Generation', () => {
  it('should pack and unpack message headers correctly', () => {
    const sessionId = 0x12345678;
    const timestamp = Math.floor(Date.now() / 1000 / 4);

    const packed = packMessageHeader(sessionId, timestamp);
    expect(packed.length).toBe(8);

    const unpacked = unpackMessageHeader(packed);
    expect(unpacked.sessionId).toBe(sessionId);
    expect(unpacked.timestamp).toBe(timestamp);
  });

  it('should generate valid Ed25519 keypairs', async () => {
    const keyPair = await generateKeyPair();
    expect(keyPair.publicKeyBytes.length).toBe(32);
    expect(keyPair.privateKeyBytes.length).toBe(32);
    expect(keyPair.publicKeyHex.length).toBe(64);
  });

  it('should compute and verify 7-byte HMAC signatures', async () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const message = packMessageHeader(42, 1000);

    const sig = await computeTruncatedHmac(message, secret);
    expect(sig.length).toBe(7);

    const isValid = await verifyTruncatedHmac(message, secret, sig);
    expect(isValid).toBe(true);

    // Tampered message should fail
    const tampered = packMessageHeader(43, 1000);
    const isTamperedValid = await verifyTruncatedHmac(tampered, secret, sig);
    expect(isTamperedValid).toBe(false);
  });

  it('should compute 7-byte truncated Ed25519 signature', async () => {
    const keyPair = await generateKeyPair();
    const message = packMessageHeader(0xaabbccdd, 5000);

    const sig7 = await computeEd25519Truncated(message, keyPair.privateKeyBytes);
    expect(sig7.length).toBe(7);
  });
});
