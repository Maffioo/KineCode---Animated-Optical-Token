# KineCode (`packages/kinecode`)

<p align="center">
  <b>Sequential Optical Protocol for Unclonable Signed Links &amp; Ephemeral Tokens.</b><br/>
  Core TypeScript engine, generator, scanner, and Web Components.
</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/kinecode.svg?color=00FFFF)](https://www.npmjs.com/package/kinecode)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## Overview

KineCode is a client-light sequential optical data transmission protocol. It slices cryptographically signed URLs and payloads across animated Version 1 QR frames scannable only in continuous sequence:

- **Anti-Screenshot:** A single photo captures only $1/N$ of the payload—mathematically useless on its own.
- **Cross-Cycle Invalidation:** Every rotation rolls nonces, timestamps, and XOR keystreams. Slices from different cycles cannot be combined.
- **Stateless Verification:** Verification servers validate the 7-byte truncated HMAC-SHA256 signature in sub-milliseconds without database roundtrips.

Use cases include **Proof-of-Presence &amp; classroom attendance**, **air-gapped zero-pairing link transfer**, **anti-scalping event credentials**, and **offline visual 2FA**.

---

## Installation

```bash
npm install kinecode
```

Or via CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>
```

---

## Usage

### 1. Transmitter (`<kine-code>` or `Generator`)

```html
<kine-code
  url="https://example.com/checkin?room=302"
  frames="4"
  fps="4"
  max-age="6"
  session-id="0xCAFE1234"
></kine-code>
```

Programmatic TypeScript:

```typescript
import { Generator } from 'kinecode';

const generator = new Generator({
  canvas: document.querySelector('canvas')!,
  url: 'https://example.com/checkin?room=302',
  frames: 4,
  fps: 4,
  sessionId: '0xCAFE1234',
  secretKey: process.env.SESSION_HMAC_KEY,
});

generator.start();
```

### 2. Receiver (`<kine-scanner>` or `Scanner` or `FrameCollector`)

```html
<kine-scanner autoStart maxAge="6"></kine-scanner>

<script>
  document.querySelector('kine-scanner')
    .addEventListener('valid-scan', (e) => {
      window.location.href = e.detail.signedUrl;
    });
</script>
```

Headless engine for native mobile apps (Expo / React Native / Flutter):

```typescript
import { FrameCollector } from 'kinecode';

const collector = new FrameCollector({ maxAge: 6 });

function onBarcodeScanned(text: string) {
  const step = collector.pushFrame(text);
  if (step.status === 'collecting') updateProgress(step.lockedFrames, step.totalFrames);
  if (step.status === 'verified') handleSuccess(step.result!.signedUrl);
}
```

### 3. Server Verification

```typescript
import { verifySignedUrl } from 'kinecode';

const KEY = process.env.KINECODE_SECRET_KEY!;

app.get('/checkin', async (req, res) => {
  const url = `https://example.com${req.originalUrl}`;
  const result = verifySignedUrl(url, KEY, { maxAge: 6, actionMode: 'redirect' });

  if (!result.valid) {
    return res.status(403).json({ error: result.error });
  }

  // Reject replay in application layer
  await db.recordVerificationOnce({ sessionId: result.sessionId, sig: req.query.kc_sig });
  res.json({ ok: true, sessionId: result.sessionId });
});
```

---

## Documentation

Full interactive simulator, mobile scanner replica, API reference tables, and RFC specification are available in the repository documentation:
- 🌐 [Interactive Simulator &amp; Web Scanner](https://github.com/Maffioo/kinecode)
- 📖 [Complete Protocol &amp; SDK Docs](https://github.com/Maffioo/kinecode/tree/main/landing/app/docs)

---

## License

[MIT](LICENSE)
