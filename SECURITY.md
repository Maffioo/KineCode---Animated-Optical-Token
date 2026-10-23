# Security Policy

## Supported Versions

Only the latest major version receives security updates and vulnerability patches.

| Version | Supported          |
| :------ | :----------------- |
| 1.x     | :white_check_mark: |
| < 1.0.0 | :x:                |

## Threat Model & Security Architecture

KineCode is designed specifically as an **Optical Proof-of-Presence (PoP)** mechanism for physical venues (classrooms, lecture halls, conference rooms, attendance check-ins). It defends against common spoofing and remote-relay attacks without requiring a central database lookup during the scanning loop.

### 1. Replay & Photo-Sharing Attack Prevention (Rolling Nonce + Burst Timeout)
- **Per-Cycle XOR Obfuscation (`cycleNonce`):** Destination URLs and signed payloads are split across $N$ cyclic frames (`4`, `6`, `8`, `12`) and XOR-masked with a rolling `cycleNonce`. No single photo reveals the destination URL, and frames from different cycles cannot be combined.
- **Strict Burst Capture Timeout (`maxCaptureDurationMs`):** All $N$ frames of a single cycle must be captured sequentially within a tight burst window (~2.5–3s), making it physically impossible to manually swipe through $N$ photos forwarded over chat apps.
- **Timestamp Freshness (`maxAgeSec`):** Payloads embed an exact Unix second timestamp (`timestampSec`). Recorded videos forwarded on messaging apps are automatically rejected by the scanner once `maxAgeSec` (default: `6 seconds`) elapses.

### 2. Video Streaming & Screen Relay Prevention (Anti-Relay Ring)
- Remote users attempting to bypass attendance via video calls (Zoom, Discord, Microsoft Teams, WhatsApp) or low-framerate screen recordings are flagged by the scanner's `AntiStreamDetector`.
- The outer ring alternates high-contrast states at 15–30 Hz. Video compression codecs (H.264, VP9, AV1) drop or blur high-frequency spatial-temporal changes, causing the camera's temporal variance detector to fail the liveness check.

### 3. Cryptographic Authenticity
- Tokens are signed at the source using **Ed25519** (`@noble/ed25519`) or high-performance **HMAC-SHA256** (Web Crypto API `crypto.subtle`).
- The 16-byte payload includes an explicit 7-byte cryptographic signature truncated according to optical bandwidth budget constraints, verified locally using the pre-shared public key or shared secret.
- An 8-bit Cyclic Redundancy Check (`CRC-8`) validates raw optical transmission integrity before cryptographic signature evaluation.

### 4. Physical Scope Limitations
- Optical verification proves that a camera-equipped device was pointed at an active projector screen displaying the synchronized animated token during the verification window.
- It does not authenticate user biometric identity; pairing with an authenticated student/employee session ID or user credential payload is recommended.

## Reporting a Vulnerability

If you discover a security vulnerability within KineCode:
1. **Do NOT** open a public issue on GitHub.
2. Send an email with a detailed explanation, proof-of-concept, and steps to reproduce to the project maintainers.
3. You will receive an acknowledgment within 48 hours.
4. Security advisories and patched releases will be coordinated prior to public disclosure.
