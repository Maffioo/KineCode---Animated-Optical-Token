# KineCode

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-white.png">
    <img src="assets/logo.png" width="128" alt="KineCode Logo">
  </picture>
</p>

<p align="center">
  <b>Animated, self-rotating QR codes for proof-of-presence check-ins.</b><br/>
  A photo forwarded to a group chat stops working within seconds.
</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/kinecode.svg?color=00FFFF)](https://www.npmjs.com/package/kinecode)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

[Why](#why-kinecode) • [Quick start](#quick-start) • [How it works](#how-it-works) • [Generator](#generator) • [Scanner](#scanner) • [Server verification](#server-verification) • [Security model](#security-model--limitations) • [API](#api-reference) • [Development](#development)

</div>

<!-- TODO: add an animated GIF of <kine-code> here and a link to the hosted web demo (web/). -->

---

## Why KineCode?

Static QR codes used for **lecture attendance, event check-ins, exams, and door access** have one fatal flaw: anyone can photograph the code and forward it. One student posts it in the class chat, and 50 students who aren't there check in from home.

KineCode replaces the static code with a short **animated loop of N standard QR frames**:

- **No single frame is enough.** The destination URL is split across `N` frames (`4`, `6`, `8`, `12`). A photo captures one frame, which is useless on its own.
- **Every cycle is new.** Each loop gets a fresh timestamp, signature, and masking nonce, so frames from different cycles can't be combined.
- **Recordings expire.** The scanner must capture all frames within a short burst window, and the signed token is rejected after `maxAge` seconds (default `6`).

It's a small TypeScript library: a generator (`<kine-code>` / `Generator`), a scanner (`<kine-scanner>` / `Scanner` / `FrameCollector`), and a one-line server verifier (`verifySignedUrl`).

---

## Quick start

```bash
npm install kinecode     # or pnpm add / yarn add / bun add
```

Or without a build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/kinecode/dist/kinecode.js"></script>
```

**Presenter screen** (projector):

```html
<kine-code url="https://example.com/checkin?room=302" frames="4" fps="4"></kine-code>
```

**Attendee phone:**

```html
<kine-scanner autoStart></kine-scanner>
<script>
  document.querySelector('kine-scanner')
    .addEventListener('valid-scan', (e) => location.href = e.detail.signedUrl);
</script>
```

> [!NOTE]
> Camera access requires a **secure context** (HTTPS or `localhost`). With no `secretKey`, the generator creates a random key each time it loads. That's fine for trying it out, but your server can't verify the result. See [Server verification](#server-verification).

---

## How it works

```
┌──────────────────────────────┐    camera, ~1–3 s     ┌──────────────────────────────┐
│  PRESENTER  <kine-code>      │ ────────────────────► │  ATTENDEE  <kine-scanner>    │
│  • signs (session, ts, url)  │                       │  • auto-detects N            │
│  • splits envelope in N QRs  │                       │  • enforces burst window     │
│  • XOR-masks with cycleNonce │                       │  • rebuilds URL + kc_* params│
│  • new nonce every cycle     │                       │  • redirects / POSTs webhook │
└──────────────────────────────┘                       └──────────────┬───────────────┘
                                                                      │ signed URL
                                                        ┌─────────────▼───────────────┐
                                                        │  YOUR SERVER                │
                                                        │  verifySignedUrl(url, key)  │
                                                        └─────────────────────────────┘
```

1. The generator builds a binary **`KC2` envelope**: `sessionId`, `timestampSec`, `maxAgeSec`, `actionMode`, a **7-byte truncated HMAC-SHA256** signature, and the target URL, protected by a CRC-8.
2. The envelope is split into `N` chunks. Each chunk is XOR-masked with a per-cycle `cycleNonce` and rendered as a standard QR code (`KC2:...`).
3. The scanner collects all `N` frames from the same cycle within the burst window, unmasks them, checks the CRC and freshness, and rebuilds the URL with `kc_session`, `kc_ts`, `kc_nonce`, `kc_sig` query parameters.
4. Your server recomputes the HMAC and checks the timestamp.

> [!IMPORTANT]
> The XOR mask **hides the URL from casual inspection; it is not encryption**. The nonce travels inside each frame. Security comes from the **HMAC signature + freshness check on your server**, not from the mask.

---

## Generator

`<kine-code>` attributes and `new Generator(options)` options share the same `camelCase` names. The web component also accepts `kebab-case` (`max-age`, `session-id`, …).

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | `''` | Destination URL / webhook split across the frames. |
| `frames` | `number` | `8` | Frames per cycle. Recommended `4`, `6`, `8`, `12` (accepted range 2–15). |
| `fps` | `number` | `4` | Frame rate in Hz. One cycle lasts `frames / fps` seconds. |
| `maxAge` | `number` | `6` | Token freshness window in seconds (clamped 2–120). **Part of the signed message.** |
| `actionMode` | `'redirect' \| 'webhook' \| 'both'` | `'redirect'` | What the scanner does after unlocking. **Part of the signed message.** |
| `rotateEveryCycle` | `boolean` | `true` | New nonce + signature after every cycle. |
| `sessionId` | `string \| number` | `0x1A2B3C4D` (`Generator`), `0xCAFE1234` (`<kine-code>`) | 32-bit room / lecture / event id, e.g. `'0xCAFE1234'`. |
| `secretKey` | `string \| Uint8Array` | random 32 bytes | 64-char hex HMAC key. ⚠️ See [Security model](#security-model--limitations). |
| `size` | `number` | `600` | Canvas size in px. |
| `skin` | `'fluid-wave' \| 'radial-equalizer' \| 'sonar-ripple'` | `'fluid-wave'` | Decorative animation around the QR. |
| `centerLogoUrl` | `string` | — | Optional logo image drawn in the center. |
| `showAntiStream` | `boolean` | `true` | Shows the anti-stream luminance ring (`showAntiStreamRing` in `Generator`). |

### Choosing `frames` × `fps`

The scanner must lock all frames within the **burst window**: `maxCaptureMs` if set, otherwise `max(3000, frames × 450)` ms. A cycle that's longer than the window **can never be scanned**.

| `frames` | Burst window (default) | 2 FPS | **4 FPS** (recommended) | 6 FPS | 8 FPS | Typical use |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `4` | 3.0 s | 2.0 s | **1.0 s** | 0.7 s | 0.5 s | Fast check-in, doors |
| `6` | 3.0 s | 3.0 s ⚠️ | **1.5 s** | 1.0 s | 0.8 s | Classrooms, conferences |
| `8` | 3.6 s | ❌ 4.0 s | **2.0 s** | 1.3 s | 1.0 s | Exams, longer URLs |
| `12` | 5.4 s | ❌ 6.0 s | **3.0 s** | 2.0 s | 1.5 s | Very long URLs |

❌ = cycle longer than the default window. Raise the scanner's `maxCaptureMs` if you need these combinations. ⚠️ = no margin for missed frames.

### Programmatic usage

```ts
import { Generator } from 'kinecode';

const generator = new Generator({
  canvas: document.querySelector('canvas')!,
  url: 'https://example.com/checkin?room=302',
  frames: 4,
  fps: 4,
  sessionId: '0xCAFE1234',
  secretKey: keyFromYourAuthenticatedSession, // never hard-code in public pages
});

generator.start();
// later: generator.stop();
```

<details>
<summary><b>React</b></summary>

```tsx
import { useEffect, useRef } from 'react';
import { Generator } from 'kinecode';

export function KineCodeQR({ url, secretKey }: { url: string; secretKey: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const generator = new Generator({ canvas: ref.current, url, secretKey, frames: 4, fps: 4 });
    generator.start();
    return () => generator.stop();
  }, [url, secretKey]);

  return <canvas ref={ref} style={{ width: '100%', maxWidth: 500 }} />;
}
```
</details>

<details>
<summary><b>Vue 3</b></summary>

```vue
<template><canvas ref="canvasEl" style="width: 100%; max-width: 500px" /></template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Generator } from 'kinecode';

const props = defineProps<{ url: string; secretKey: string }>();
const canvasEl = ref<HTMLCanvasElement | null>(null);
let generator: Generator | null = null;

onMounted(() => {
  generator = new Generator({ canvas: canvasEl.value!, url: props.url, secretKey: props.secretKey, frames: 4 });
  generator.start();
});
onUnmounted(() => generator?.stop());
</script>
```
</details>

<details>
<summary><b>Angular (standalone)</b></summary>

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'kinecode'; // registers <kine-code> and <kine-scanner>

@Component({
  selector: 'app-attendance-qr',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<kine-code url="https://example.com/checkin?room=302" frames="4" fps="4"></kine-code>`,
})
export class AttendanceQrComponent {}
```
</details>

---

## Scanner

Pick **one**:

| You have… | Use |
| :--- | :--- |
| A web page, and you want a ready-made camera widget | `<kine-scanner>` |
| A web page with your own `<video>` / UI | `new Scanner(options)` |
| A native app that already reads QR strings (`expo-camera`, VisionCamera, ML Kit, …) | `new FrameCollector(options)` |

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `secretKey` | `string \| Uint8Array` | — | Optional client-side signature check. **Leave unset in production** and verify on the server. |
| `maxAge` | `number` | `6` | Max token age in seconds. The stricter of this and the generator's `maxAge` applies. |
| `maxCaptureMs` | `number` | `max(3000, N × 450)` | Burst window from first to last frame. |
| `webhookUrl` | `string` | target URL | Endpoint for the `POST` in `webhook` / `both` mode. |
| `autoRedirect` | `boolean` | `false` | Navigate to `signedUrl` in `redirect` / `both` mode. |
| `autoStart` | `boolean` | `false` | `<kine-scanner>` only: start the camera on mount. |

### `<kine-scanner>`

```html
<kine-scanner autoStart maxAge="6"></kine-scanner>

<script>
  const scanner = document.querySelector('kine-scanner');

  scanner.addEventListener('scan-progress', (e) =>
    console.log(`${e.detail.lockedFrames}/${e.detail.totalFrames}`));

  scanner.addEventListener('valid-scan', (e) =>
    fetch('/api/checkin', { method: 'POST', body: JSON.stringify({ url: e.detail.signedUrl }) }));

  scanner.addEventListener('scan-error', (e) => console.warn(e.detail.error));
</script>
```

### `new Scanner()`

```ts
import { Scanner } from 'kinecode';

const scanner = new Scanner({
  videoElement: document.querySelector('video')!,
  overlayCanvas: document.querySelector('canvas')!,  // AR guidance overlay
  onProgress: (locked, total) => console.log(`${locked}/${total}`),
  onGuidanceChange: (g) => console.log(g.message),  // "too far", "stabilize", …
  onValidScan: (result) => { if (result.valid) submit(result.signedUrl); },
});

await scanner.startCamera();
// later: scanner.stop();
```

### `FrameCollector` (native / custom readers)

```ts
import { FrameCollector } from 'kinecode';

const collector = new FrameCollector({ maxAge: 6 });

function onBarcodeScanned(text: string) {
  const step = collector.pushFrame(text);
  if (step.status === 'collecting') showProgress(step.lockedFrames, step.totalFrames);
  if (step.status === 'verified')   submit(step.result!.signedUrl);
  if (step.status === 'rejected')   console.warn(step.result!.error);
}
```

See [`mobile/App.tsx`](mobile/App.tsx) for a complete Expo example.

### Webhook payload

In `webhook` / `both` mode, the scanner sends a `POST` (`Content-Type: application/json`) with this body:

```json
{
  "event": "proof_of_presence_verified",
  "sessionId": 3405697588,
  "sessionIdHex": "0xCAFE1234",
  "timestamp": 1729681204,
  "timeDiffSeconds": 1,
  "captureDurationMs": 1120,
  "totalFrames": 4,
  "cycleNonce": 167,
  "signature": "a9f14bc32e7810",
  "targetUrl": "https://example.com/checkin?room=302",
  "signedUrl": "https://example.com/checkin?room=302&kc_session=0xCAFE1234&kc_ts=1729681204&kc_nonce=A7&kc_sig=a9f14bc32e7810",
  "verifiedAt": "2026-10-23T19:40:05.000Z",
  "antiStreamScore": 0.82
}
```

The phone sends this body, so **don't trust it**. Re-verify `signedUrl` on the server.

---

## Server verification

The scanner produces a URL like:

```text
https://example.com/checkin?room=302&kc_session=0xCAFE1234&kc_ts=1729681204&kc_nonce=A7&kc_sig=a9f14bc32e7810
```

```ts
import { verifySignedUrl } from 'kinecode';

const KEY = process.env.KINECODE_SECRET_KEY!; // same key as the generator

app.get('/checkin', requireLogin, async (req, res) => {
  // Rebuild the exact URL the generator signed. Behind a proxy, use your public origin, not req.protocol.
  const url = `https://example.com${req.originalUrl}`;

  const v = verifySignedUrl(url, KEY, { maxAge: 6, actionMode: 'redirect' });
  if (!v.valid) return res.status(403).json({ error: v.error });

  // Bind to the logged-in user and reject token reuse (see Security model).
  await db.recordAttendanceOnce({ userId: req.user.id, sessionId: v.sessionId, sig: req.query.kc_sig });
  res.json({ ok: true });
});
```

> [!WARNING]
> `maxAge`, `actionMode`, and the **base URL** (everything before `kc_session`) are part of the signed message. If any of them differs from the generator's value, **every signature will be rejected**. Use the same values on both sides.

---

## Security model & limitations

HMAC is symmetric: **whoever holds `secretKey` can mint valid tokens**. Recommended deployment:

- **Scanner (attendee devices):** no `secretKey`. It only reads the code optically and forwards `signedUrl` to your server.
- **Presenter screen:** load the key only inside an authenticated presenter/admin page or a kiosk. Never put it in a public page's source.
- **Server:** keeps the key in an environment variable and calls `verifySignedUrl`.

What KineCode **does** protect against:
- ✅ photos of the code (one frame isn't enough, and frames from different cycles don't combine);
- ✅ replaying a recording or a forwarded link after `maxAge` seconds;
- ✅ tampering with the URL, session, or timestamp (HMAC).

What it **does not** protect against (handle these in your app):
- ❌ **Link sharing within the freshness window.** A student in the room can forward `signedUrl` and it stays valid for `maxAge` seconds. Require login, bind the check-in to the user, and **accept each `kc_sig` only once**. `verifySignedUrl` is stateless and doesn't do this for you.
- ❌ **Live video calls** pointed at the projector. `AntiStreamDetector` is only a heuristic.
- ❌ **Strong cryptographic guarantees.** The signature is truncated to **56 bits** and compared in non-constant time. That's fine for short-lived attendance tokens; don't use it for payments or authentication.
- ❌ **Public-key verification.** The `Generator` can produce truncated Ed25519 signatures (`useHmac: false`), but a 7-byte truncated Ed25519 signature **can't be verified** with the public key, and every verifier in this package checks HMAC only.
- ❌ **Clock skew.** Server and presenter clocks must agree within a few seconds (use NTP).

Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

---

## API reference

Main exports from `kinecode`:

| Export | Kind | Description |
| :--- | :--- | :--- |
| `Generator` | class | Renders the animated code on a canvas. `start()`, `stop()`, `setTargetUrl()`, `setFps()`, … |
| `KineCodeElement` | custom element | `<kine-code>`, auto-registered on import. |
| `Scanner` | class | Camera scanner with `jsQR` decoding and AR guidance. `startCamera()`, `stop()`. |
| `KineScannerElement` | custom element | `<kine-scanner>`, auto-registered on import. Events: `scan-progress`, `valid-scan`, `scan-error`. |
| `FrameCollector` | class | Headless decoder: `pushFrame(qrText)`, `reset()`. |
| `verifySignedUrl(url, key, { maxAge?, actionMode? })` | function | Server-side HMAC + freshness check. |
| `constructSignedUrl(url, sessionId, ts, sig, nonce?)` | function | Appends `kc_*` parameters. |
| `buildDynamicEnvelope` / `parseDynamicEnvelope` | function | Encode / decode a `KC2` envelope. |
| `encodeEnvelopeToFrames(env, N, nonce)` / `assembleDynamicEnvelope(map, N)` | function | Split + mask / unmask + reassemble. |
| `decodeQrFrameString(text)` | function | Parse a single `KC2:` / legacy `KC:` frame. |
| `computeTruncatedHmacSync(msg, key)` | function | 7-byte HMAC-SHA256. |
| `generateKeyPair()` | async function | Random 32-byte key: `{ privateKeyHex, publicKeyHex, … }`. Use `privateKeyHex` as `secretKey`. |
| `toHex` / `fromHex` | function | Hex ↔ `Uint8Array`. |
| `CornerDetector`, `AntiStreamDetector` | class | Low-level vision helpers used by `Scanner`. |
| `renderFluidWave`, `renderRadialEqualizer`, `renderSonarRipple` | function | Skin renderers. |

Full types: [`packages/kinecode/src/index.ts`](packages/kinecode/src/index.ts).

---

## Development

```bash
git clone <repo-url> && cd kinecode
npm install

npm run dev          # web testbench + QR builder (Vite)
npm run dev:https    # same over HTTPS, needed to use the camera from a phone on your LAN
npm test             # Vitest (packages/kinecode)
npm run build        # library + web

npm --prefix mobile install && npm run mobile:start   # Expo scanner app
```

```text
packages/kinecode/   # published npm package: core (framing, crypto, crc8), generator, scanner
web/                 # Vite testbench, QR builder, standalone web scanner
mobile/              # Expo / React Native scanner using FrameCollector
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, CI, and release process.

---

## License

[MIT](LICENSE)
