# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-10-23

### Security
- **Production Key Management & Zero-Trust Client Architecture Documentation**:
  - Added explicit security warnings in [SECURITY.md](file:///c:/Progetti/KineCode%20-%20Animated%20Optical%20Token/SECURITY.md), [README.md](file:///c:/Progetti/KineCode%20-%20Animated%20Optical%20Token/README.md), and [packages/kinecode/README.md](file:///c:/Progetti/KineCode%20-%20Animated%20Optical%20Token/packages/kinecode/README.md) detailing why symmetric `secretKey` values must never be published in client-side HTML or user-accessible scripts in production.
  - Documented the **Zero-Trust Client Scanner** model: attendee scanners (`<kine-scanner>`, mobile app) omit `secretKey`, decode optical frames without holding keys, and submit signed payloads to the backend for verification.
  - Documented production generator display deployment options: Authenticated Presenter Dashboard, Server-Assisted Token Streaming (WebSocket / SSE), and Asymmetric Ed25519 signing.
  - Added copy-paste backend verification pattern for Express/Node.js utilizing `verifySignedUrl()`.
  - Added a visual security notice in the web QR Builder (`web/index.html`) regarding prototyping vs. production key handling.

## [0.1.0] - 2026-10-23

### Added
- **Clean Monorepo Workspace Architecture (`packages/kinecode`, `web`, `mobile`)**:
  - Separated the core protocol and npm library into `packages/kinecode/`, the interactive Vite web dashboard and QR builder into `web/`, and the native Expo mobile scanner into `mobile/`.
  - Added `mobile/metro.config.js` and workspace path aliases so both `web/` and `mobile/` import directly from `packages/kinecode`.
- **Dynamic Multi-Frame URL Fragmentation & Rolling XOR Envelope Protocol (`KC2` in `framing.ts`)**:
  - Added `buildDynamicEnvelope`, `parseDynamicEnvelope`, `encodeEnvelopeToFrames`, `assembleDynamicEnvelope`, `computeCycleMaskByte`, `constructSignedUrl`, `verifySignedUrl`, and `FrameCollector`.
  - Splits any destination URL or webhook endpoint across a configurable number of cyclic frames (`frames`: `4`, `6`, `8`, `12`).
  - XOR-masks every frame byte with a rolling per-cycle `cycleNonce` (`0x00..0xFF`), ensuring no single frame leaks plain-text URL characters and frames never repeat across cycles.
- **Headless Multi-Frame Decoder & 1-Line Server Verifier (`framing.ts`)**:
  - Added `FrameCollector` stateful class for headless/mobile camera decoders (`expo-camera`, `react-native-vision-camera`, `AVFoundation`, `MLKit`) with automatic `totalFrames` detection, `cycleNonce` reset, and burst timeout protection.
  - Added `verifySignedUrl(requestUrl, secretKey, options)` for 1-line backend verification of `kc_session`, `kc_ts`, `kc_nonce`, and `kc_sig` query parameters.
- **1:1 HTML Attributes & JS Constructor Options Parity (`Generator.ts`, `Scanner.ts`, `KineScannerElement.ts`)**:
  - Unified `<kine-code>` and `new Generator(options)` (`url`, `frames`, `fps`, `maxAge`, `actionMode`, `rotateEveryCycle`, `sessionId`, `secretKey`, `size`) as well as `<kine-scanner>` and `new Scanner(options)` (`secretKey`, `maxAge`, `maxCaptureMs`, `webhookUrl`, `autoRedirect`) with full backwards compatibility for legacy aliases.
- **Automated CI/CD & Auto-Publish Workflows (`.github/workflows/ci.yml`, `.github/workflows/release.yml`)**:
  - Added GitHub Actions workflows for automated testing on every push/PR and automatic SemVer version bumping (`fix:` / `feat:` / `BREAKING CHANGE`), GitHub Release creation, and `npm publish` on push to `main` when `packages/kinecode/**` changes.
- **Synchronous Pure-TS SHA-256 & HMAC-SHA256 (`crypto.ts`, `Generator.ts`)**:
  - Added `sha256Sync`, `computeTruncatedHmacSync`, and `refreshPayloadSync` so `<kine-code>` and `Generator` render frames synchronously on frame 0 and work across both HTTP LAN IPs and HTTPS contexts without `crypto.subtle` restrictions.
- **Zero-Settings Auto-Detect Frame Count (`Scanner.ts`, `mobile/App.tsx`)**:
  - Web and Mobile scanners automatically detect the required number of frames (`4`, `6`, `8`, `12`) from the first captured frame without requiring any pre-configured frame count.
- **Live Code Inspector & Interactive QR Builder (`index.html`, `src/main.ts`)**:
  - Added the **🔍 Live Code Inspector** in the Dual Testbench showing real-time frame transmission (`1..N`), active `cycleNonce`, raw `KC2:` payload, QR matrix version, and clickable Signed URL.
  - Added dynamic duration calculation (`frames / fps`) under the frame count buttons in the **🛠️ QR Builder**.
- **Comprehensive Multi-Framework Documentation (`README.md`)**:
  - Added copy-paste integration guides for Plain HTML/Vanilla JS, React/Next.js/Vite, Vue 3/Nuxt, Angular, and Svelte, plus full attribute reference tables and server verification examples.
- **Brand Identity & Application Logo Assets (`assets/`, `public/`, `mobile/assets/`)**:
  - Added official KineCode kinetic matrix "K" logo (`logo.png`, `logo-white.png`, `favicon.png`).
  - Integrated adaptive mobile app icon assets (`mobile/assets/icon.png`, `android-icon-foreground.png`, `splash-icon.png`, `android-icon-monochrome.png`).
  - Updated web dashboard (`index.html`), standalone web scanner (`scanner.html`), React Native mobile app (`mobile/App.tsx`), and documentation header (`README.md`) with the new branding.

### Changed
- Translated all UI strings, guidance HUD messages, and interactive dashboard texts across `index.html`, `src/main.ts`, `scanner.html`, `src/scanner-page.ts`, `src/scanner/Scanner.ts`, `src/scanner/CornerDetector.ts`, `src/scanner/KineScannerElement.ts`, and `mobile/App.tsx` into English for international distribution.
- Redesigned the post-scan verification modal (`mobile/App.tsx`, `scanner.html`, `index.html`) to be clean and emoji-free, displaying only the extracted destination website domain, a primary `Open Link` button with a standard external-link vector icon, and a `New Scan` button (removing internal sync/ms/session telemetry).
- Removed the redundant `Projector` and `Settings & Webhook` tabs from `index.html`, consolidating all configuration into the **QR Builder** and making the Web Camera Scanner (`src/main.ts`, `Scanner.ts`) 100% zero-config and agnostic (extracting `totalFrames`, `maxAgeSec`, `actionMode`, `targetUrl`, and `signature` directly from the `KC2` envelope, identical to the mobile app).
- Removed the `skin` selector from the QR Builder UI and generated `<kine-code>` snippet to focus on the high-contrast Animated QR matrix standard.
- Set `packages/kinecode/package.json` version to `0.1.0` with `prepublishOnly` script and updated `.github/workflows/release.yml` to publish from `--workspace=kinecode`.
- Refactored `mobile/App.tsx` to use `FrameCollector` directly from `kinecode`, eliminating all duplicated CRC-8, XOR mask, and envelope parsing code in the mobile app.
- Made `KineCodeElement` and `KineScannerElement` safe to import in non-DOM runtimes (Node.js SSR, React Native / Hermes) when `HTMLElement` is undefined.

### Removed
- Removed legacy unused `mobile/src/ScannerHtml.ts` and `react-native-webview` dependency from `mobile/package.json`.

### Security
- **Strict Burst Capture Timeout (`maxCaptureDurationMs`)**:
  - Enforces a strict time window from the first locked frame to the $N$-th frame, preventing manual swiping of sequential photos shared on chat apps.
- **Per-Cycle Nonce Rotation (`rotateEveryCycle`)**:
  - Invalidates frames from previous cycles so old photos cannot be combined with new frames.

---

## [1.3.0] - 2026-10-23

### Added
- **Animated QR Version 1 (21×21) Protocol (`framing.ts`, `FluidWave.ts`)**:
  - Encodes each of the 8 cyclic frames into a compact 12-character uppercase Alphanumeric QR string (`"KC:<idx>:<byteA><byteB>:<crc8>"`, e.g., `"KC:0:1A2B:F4"`).
  - Generates standard ISO/IEC 18004 **Version 1 (21×21)** QR matrices with Level M Reed-Solomon error correction via `qrcode`, ensuring maximum module size for 10–15m projector readability.
  - Added `generateQrMatrix`, `encodeFrameToQrString`, and `decodeQrFrameString` in `src/core/framing.ts`.
- **Battle-Tested Web QR Decoder (`Scanner.ts`)**:
  - Integrated `jsQR` into `Scanner.ts` for instant, Reed-Solomon error-corrected decoding, perspective corner extraction, and 3-finder pattern tracking.
- **Native Hardware QR Scanner on Mobile (`mobile/App.tsx`)**:
  - Upgraded the Expo app to use `expo-camera`'s `<CameraView barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />` directly (Apple Vision on iOS, Google MLKit on Android), eliminating WebView lag and tunnel URL configuration.

### Changed
- Updated `FluidWave.ts` to render crisp, pixel-aligned Version 1 (21×21) QR codes inside a 4-module white quiet zone.
- Updated `test/cornerDetector.test.ts` to test end-to-end `qrcode` generation and `jsQR` decoding across 0°, 90°, 180°, and 270° camera rotations.

---

## [1.2.0] - 2026-10-23

### Added
- **Pure Black & White 6×6 Matrix Protocol (`framing.ts`, `FluidWave.ts`)**:
  - Replaced color-dependent encoding with a pure binary B/W (White = `1`, Black = `0`) 6×6 matrix (36 bits per frame).
  - Embedded local contrast calibration anchors directly in the matrix (`Cell 0 = 1` White reference, `Cell 1 = 0` Black reference), plus a 3-bit frame index, clock bit, 16 data bits (`byteA`, `byteB`), 8-bit frame CRC-8 checksum, 5-bit Barker sync footer (`10110`/`10101`), and inverted clock parity bit.
  - Added `encodeFrameToMatrixBits` and `decodeMatrixFrame` in `src/core/framing.ts`.
- **QR-Style 3-Finder Pattern Orientation & Detection (`CornerDetector.ts`)**:
  - Implemented 3 concentric `1:1:3:1:1` (7×7 module) Finder Patterns at Top-Left, Top-Right, and Bottom-Left (leaving Bottom-Right empty like a QR code).
  - Implemented a horizontal + vertical `1:1:3:1:1` run-length scanner with concentric black-ring enclosure verification and multi-threshold pass for uneven room lighting.
  - Automatically resolves 360° camera rotation by identifying the L-triangle hypotenuse (`TL` vertex) and 2D cross product (`TR` vs `BL`), extrapolating the 4th corner via `quadFromThreeFinders`.
- **End-to-End Multi-Rotation Optical Test (`test/cornerDetector.test.ts`)**:
  - Verifies synthetic rendering, 3-finder detection, perspective homography sampling, and full 8-frame payload reconstruction across 0°, 90°, 180°, and 270° camera orientations.

### Changed
- Removed blurs, background ripple circles, central color pie, and spinning perimeter dot from `FluidWave.ts` in favor of a crisp, foundational B/W square matrix.
- Updated `Scanner.ts` to sample the 36 B/W matrix cells using local Cell 0 / Cell 1 luminance thresholding and clock-transition liveness verification.

---

## [1.1.0] - 2026-10-23

### Added
- **Unified Square Fluid Wave Standard (`FluidWave.ts`)**:
  - Replaces fragmented radial skins with a continuous, organic 2D fluid wave rendering engine.
  - Masks 16 deterministic grid nodes in a 4x4 matrix using bioluminescent radial droplet gradients and smooth cosine easing (`MORPH_DURATION_MS = 120ms`).
  - Implements 4 high-contrast Corner Finder Patterns (fiducials) with a distinct Top-Left Cyan orientation key for 360° rotational disambiguation.
  - Replaces the 20Hz stroboscopic flicker with a continuous orbital perimeter wave flow, eliminating optical flicker and seizure hazards while preserving anti-stream relay detection.
- **Pure-TypeScript Perspective Homography & Corner Detection (`CornerDetector.ts`)**:
  - Computes exact 3x3 projective homography transformation matrix from the 4 detected corners into normalized $[0..1] \times [0..1]$ space with zero external dependencies.
  - Automatically compensates for off-axis camera tilts, pitch, roll, and yaw (keystoning).
- **Autonomous Scanner Guidance System**:
  - Automatically assesses quad size and hand stability, providing real-time HUD guidance:
    - `"Inquadra il token KineCode"` (searching)
    - `"Avvicinati al proiettore"` (quad area < 4%)
    - `"Allontanati leggermente"` (quad area > 82% or touching screen border)
    - `"Tieni fermo il dispositivo"` (excessive jitter / hand motion)
    - `"Agganciato! Acquisizione..."` (tracking locked)
- **Augmented Reality (AR) HUD Overlay (`Scanner.ts`)**:
  - Renders glowing corner brackets tracking the projected token across the camera feed in real time.
  - Displays preview sample dots at the 16 projective grid coordinates and 8-segment cyclic frame acquisition progress.
- **New Test Suite (`test/cornerDetector.test.ts`)**:
  - 5 comprehensive unit tests verifying homography matrix mapping, affine transformations, perspective trapezoid unwarping, Shoelace area calculation, guidance feedback states, and grid coordinates.

### Changed
- Standardized default skin in `Generator.ts` and `<pop-generator>` to `'fluid-wave'`.
- Refactored `Scanner.ts` from static screen-center reticle sampling to autonomous 4-corner perspective tracking and homography sampling.
- Updated `PopScannerElement.ts` to surface real-time guidance feedback directly in the UI.
- Updated `index.html` and `scanner.html` to showcase the new Square Fluid Wave standard and autonomous guidance HUD.

---

## [1.0.0] - 2026-10-23

### Added
- **Core Engine (`src/core/`)**:
  - `types.ts`: High-contrast 4-color palette (Cyan, Magenta, Yellow, White), 16-capsule frame structures, and 16-byte payload layout.
  - `crc8.ts`: Fast table-driven CRC-8 checksum calculation (polynomial 0x07).
  - `crypto.ts`: Keypair generation, 7-byte truncated Ed25519 signatures, and HMAC-SHA256 authentication using Web Crypto.
  - `color.ts`: Dynamic color calibration against central 4-color core, 5x5 box noise averaging, and Euclidean distance color classification.
  - `framing.ts`: Slicing 16-byte payload into 8 cyclic frames with frame index, parity, clock sync, and local frame CRC-8 error rejection.
- **Generator (`src/generator/`)**:
  - `Generator.ts`: HTML5 `<canvas>` rendering engine with 4Hz frame rate (50ms morph + 200ms stable plateau).
  - `RadialEqualizer.ts`: Modern default skin featuring 16 radial capsules and 20Hz anti-relay flicker ring.
  - `SonarRipple.ts`: Concentric pulsed ripple visual skin.
  - `PopGeneratorElement.ts`: Reusable `<pop-generator>` Web Component.
- **Scanner (`src/scanner/`)**:
  - `Scanner.ts`: Continuous frame sampler with central reticle, dynamic calibration, cyclic 8-frame assembler, freshness verification (±6s), and webhook trigger.
  - `AntiStreamDetector.ts`: 20Hz temporal variance analyzer detecting live optical flicker vs screen recordings or video relay attacks.
  - `PopScannerElement.ts`: Reusable `<pop-scanner>` Web Component.
- **Dashboard & Testbench (`index.html`, `src/main.ts`)**:
  - Dual testbench with virtual loopback mode for desktop testing without camera hardware.
  - Fullscreen Projector mode.
  - Mobile Camera Scanner mode.
  - Settings panel with real-time key generation and webhook configuration.
- **Mobile Application (`mobile/`)**:
  - Full React Native / Expo mobile application for instant camera scanning.
  - Native haptic feedback via `expo-haptics` on frame locks and presence verification.
  - Local history modal with timestamps and verified session IDs.
  - Cross-network tunneling via `npm run mobile:tunnel`.
- **Package & Distribution Tooling**:
  - `src/index.ts`: Unified library entry point exporting all primitives, types, Generator, Scanner, skins, and Web Components.
  - Configured `vite.config.ts` for dual ESM (`dist/kinecode.js`) and UMD (`dist/kinecode.umd.cjs`) library bundles.
  - Configured `tsconfig.build.json` for automated `.d.ts` TypeScript declaration emitting (`dist/types/index.d.ts`).
  - Added npm package metadata, exports map, and keywords in `package.json`.
  - Comprehensive user-first documentation in `README.md` with npm/CDN installation, React/Vue/Vanilla quickstarts, and server-side verification.
  - Separated contributor workflow into `CONTRIBUTING.md`.
  - Added `@vitejs/plugin-basic-ssl` for mobile camera testing via local HTTPS.
- **Test Suite (`test/`)**:
  - 15 unit tests covering CRC-8, cryptography, framing, color classification, and anti-stream detection.

### Fixed
- Fixed YAML frontmatter parsing issue in `.agents/rules/documentation-sync.md`.
