# KineCode

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-white.png">
    <img src="assets/logo.png" width="128" alt="KineCode Logo">
  </picture>
</p>

<p align="center">
  <b>Sequential Optical Protocol for Unclonable Signed Links &amp; Ephemeral Tokens.</b><br/>
  Payloads are split across animated frames scannable only in sequence. A forwarded photo or screenshot expires within seconds.
</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/kinecode.svg?color=00FFFF)](https://www.npmjs.com/package/kinecode)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

[Documentation](landing/app/docs) • [Live Simulator &amp; Web Scanner](https://github.com/Maffioo/kinecode) • [Quick Start](#quick-start) • [How It Works](#how-it-works) • [Monorepo Ecosystem](#monorepo-ecosystem)

</div>

---

> [!TIP]
> 📖 **Comprehensive Documentation &amp; Live Sandbox**:
> The full interactive simulator, live smartphone scanner replica, binary RFC specification, and complete API tables are hosted on the showcase site:
> - 🌐 **[Interactive Simulator &amp; Showcase](landing/)**
> - 📱 **[Web Scanner Replica](landing/app/scanner)**
> - 📚 **[Full Documentation &amp; Protocol Specs](landing/app/docs)**

---

## What is KineCode?

Standard static QR codes and links have an inherent security limitation: anyone can capture a photo or screenshot and forward it across messaging apps (WhatsApp, Telegram) to hundreds of remote users.

**KineCode is a sequential optical transmission protocol.** It takes signed URLs, ephemeral tokens, or structured payloads, fragments them across a rapid animated loop of $N$ standard Version 1 QR frames, and enforces strict temporal synchrony:

1. **Information Incompleteness:** A still photograph captures only a single frame ($1/N$ of the payload)—mathematically useless on its own.
2. **Deterministic Rolling Nonces:** Every cycle rolls fresh nonces, timestamps, and XOR keystreams. Slices from different rotations cannot be stitched together.
3. **Sub-Second Burst Window:** The receiver's camera must capture the uninterrupted sequence in $\approx 1$ second, and the resulting HMAC token expires in seconds.

### Key Use Cases
- 🎓 **Proof-of-Presence &amp; Attendance (Flagship):** Classroom lectures, exams, conferences, and corporate check-ins where physical presence is required and absentee photo forwarding must be stopped.
- 📡 **Air-Gapped &amp; Zero-Pairing Data Transfer:** Beam one-time authenticated links, cryptographic credentials, or setup configs screen-to-camera with zero Bluetooth, Wi-Fi, or pairing friction.
- 🎟️ **Anti-Scalp Gate Access:** Dynamic venue credentials and turnstile tokens that cannot be resold or used via forwarded screenshots.
- 🔐 **Offline Visual 2FA &amp; POS Authorization:** Authenticate sensitive operations via an interactive visual stream without typing manual 6-digit OTP codes.

---

## How It Works

```
┌──────────────────────────────┐    Camera Stream (~1 s)   ┌──────────────────────────────┐
│  TRANSMITTER / PRESENTER     │ ────────────────────────► │  RECEIVER / ATTENDEE         │
│  <kine-code> / Generator     │                           │  <kine-scanner> / Scanner    │
│  • Builds binary KC2 envelope│                           │  • Locks sequential frames   │
│  • Truncated HMAC signature  │                           │  • Enforces burst window     │
│  • Slices into N V1 frames   │                           │  • Reassembles signedUrl     │
│  • XOR-masks with cycleNonce │                           │  • Dispatches redirect/POST  │
└──────────────────────────────┘                           └──────────────┬───────────────┘
                                                                          │ signedUrl
                                                            ┌─────────────▼───────────────┐
                                                            │  YOUR SERVER                │
                                                            │  verifySignedUrl(url, key)  │
                                                            └─────────────────────────────┘
```

---

## Quick Start

### 1. Install

```bash
npm install kinecode
```

Or via CDN without a build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>
```

### 2. Transmitter (Presenter / Display)

```html
<kine-code
  url="https://example.com/checkin?room=302"
  frames="4"
  fps="4"
  max-age="6"
  session-id="0xCAFE1234"
></kine-code>
```

### 3. Receiver (Attendee Camera Scanner)

```html
<kine-scanner autoStart maxAge="6"></kine-scanner>

<script>
  document.querySelector('kine-scanner')
    .addEventListener('valid-scan', (e) => {
      // Reconstructed signed URL with kc_session, kc_ts, kc_nonce, kc_sig
      window.location.href = e.detail.signedUrl;
    });
</script>
```

*(For native mobile apps with Expo, React Native, or Flutter, use the headless `FrameCollector` engine).*

### 4. Server Verification

```typescript
import { verifySignedUrl } from 'kinecode';

const KEY = process.env.KINECODE_SECRET_KEY!; // 64-char hex key

app.get('/checkin', async (req, res) => {
  const url = `https://example.com${req.originalUrl}`;
  const result = verifySignedUrl(url, KEY, { maxAge: 6, actionMode: 'redirect' });

  if (!result.valid) {
    return res.status(403).json({ error: result.error });
  }

  // Bind to session and reject replay:
  await db.recordVerificationOnce({ sessionId: result.sessionId, sig: req.query.kc_sig });
  res.json({ ok: true, sessionId: result.sessionId });
});
```

---

## Monorepo Ecosystem

```text
├── packages/kinecode/   # Published npm library: core protocol, framing, generator, scanner
├── landing/             # Next.js showcase web app, interactive simulator & full documentation
└── mobile/              # Native Expo / React Native scanner utilizing FrameCollector
```

### Local Development

```bash
npm install

# Start Next.js Showcase & Interactive Docs
npm run dev

# Run Vitest test suite
npm test

# Build all production targets (SDK library & Showcase landing)
npm run build
```

---

## Full Documentation

For detailed parameters, threat models, and architectural specifications, consult the official documentation:
- 📖 [Architecture &amp; Core Concepts](landing/app/docs)
- 🚀 [Developer Quickstart &amp; Framework Integrations](landing/app/docs/quickstart)
- 📐 [Binary Framing RFC &amp; Packet Layout](landing/app/docs/protocol)
- ⚙️ [SDK &amp; Web Components API Reference](landing/app/docs/api)
- 🛡️ [Threat Model &amp; Security Analysis](landing/app/docs/security)

---

## License

[MIT](LICENSE)
