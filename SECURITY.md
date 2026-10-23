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
- The 16-byte payload includes an explicit 7-byte cryptographic signature truncated according to optical bandwidth budget constraints, verified locally using the pre-shared public key or verified server-side using the shared secret.
- An 8-bit Cyclic Redundancy Check (`CRC-8`) validates raw optical transmission integrity before cryptographic signature evaluation.

### 4. Key Management & Production Threat Architecture

> [!WARNING]
> **Never embed symmetric keys (`secretKey`) in public client-side code.**
> In quick-start examples, `secretKey` is shown directly in HTML/JS for immediate local testing without needing a backend server. In production, placing a symmetric key in client HTML/JS allows anyone with browser DevTools to read the key and forge tokens offline.

To deploy KineCode securely in production, follow these principles:

#### A. Zero-Trust Scanner Clients (No Secrets on User Devices)
- End-user scanner devices (`<kine-scanner>`, mobile apps) are untrusted clients and **must NOT contain the `secretKey`**.
- Leave `secretKey` omitted (`undefined`) in `<kine-scanner>`.
- The scanner captures the optical frames, decodes the signed payload (`sessionId`, `timestamp`, `cycleNonce`, `signature`), and either redirects or submits (`POST`) the payload to your backend server along with the user's authenticated session cookie or JWT.

#### B. Server-Side Verification
- The backend server stores `KINECODE_SECRET_KEY` in environment variables or a secret vault.
- When the client submits the scan result, the backend invokes `verifySignedUrl(url, secretKey)` or `verifyTruncatedHmac(header, secretKey, signature)`.
- The server checks:
  1. **Signature authenticity:** Matches the backend's secret key.
  2. **Timestamp freshness:** Rejects timestamps older than `maxAgeSec` (default 6 seconds).
  3. **Replay prevention:** Ensures the specific `(sessionId, timestamp, cycleNonce)` combination has not already been redeemed by another request or is within an active live window.

#### C. Presenter / Generator Deployment Options
- **Authenticated Presenter Dashboard:** The `<kine-code>` generator runs on a projector screen inside a password-protected presenter/teacher dashboard or a dedicated hardware kiosk (e.g. Raspberry Pi display). Attendees/students never have access to this page's source code.
- **Server-Side Token Streaming (WebSocket / SSE):** The backend signs ephemeral payloads and streams them to the projector display. The presenter client only displays what the server pushes, never holding a master secret.
- **Asymmetric Signing (Ed25519):** Tokens are signed using an Ed25519 private key held on the server or presenter device. Scanners or third-party verifiers only need the **public key**, which is cryptographically impossible to use for forging signatures.

### 5. Physical Scope Limitations
- Optical verification proves that a camera-equipped device was pointed at an active projector screen displaying the synchronized animated token during the verification window.
- It does not authenticate user biometric identity; pairing with an authenticated student/employee session ID or user credential payload is recommended.

## Reporting a Vulnerability

If you discover a security vulnerability within KineCode:
1. **Do NOT** open a public issue on GitHub.
2. Send an email with a detailed explanation, proof-of-concept, and steps to reproduce to the project maintainers.
3. You will receive an acknowledgment within 48 hours.
4. Security advisories and patched releases will be coordinated prior to public disclosure.
