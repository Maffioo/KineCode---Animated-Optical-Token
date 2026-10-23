# Contributing to KineCode

Thank you for your interest in contributing to KineCode!

## Monorepo Overview

- **`packages/kinecode/`**: Core protocol, cryptographic primitives, `Generator`, `Scanner`, `FrameCollector`, Web Components (`<kine-code>`, `<kine-scanner>`), and Vitest unit tests.
- **`web/`**: Interactive Vite web application (Dual Testbench, Live Code Inspector, QR Builder, and standalone Web Scanner).
- **`mobile/`**: Native React Native / Expo mobile scanner application powered by `expo-camera` and `FrameCollector`.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/kinecode.git
   cd kinecode
   ```

2. **Install workspace dependencies:**
   ```bash
   npm install
   ```

3. **Start the Web Dashboard & QR Builder (`web/`):**
   ```bash
   npm run dev
   ```

4. **Start HTTPS development server (for testing camera on mobile browsers):**
   ```bash
   npm run dev:https
   ```

5. **Run unit tests (`packages/kinecode/test/`):**
   ```bash
   npm test
   ```

6. **Build the SDK library (`packages/kinecode`) and Web app (`web/`):**
   ```bash
   npm run build
   ```

7. **Start the Native Mobile App (`mobile/`):**
   ```bash
   npm run mobile:start
   ```

## Engineering Directives

- **Zero Heavy Dependencies:** Core logic in `packages/kinecode` must remain lightweight. Do not add heavy computer vision or runtime libraries.
- **Strict TypeScript:** Run `npm run build` to ensure zero type errors or unused variables across both `packages/kinecode` and `web/`, and `npx --prefix mobile tsc --noEmit` for `mobile/`.
- **Test-Driven:** Run `npm test` (`vitest run`). Any new feature or bugfix in the protocol must include corresponding unit tests under `packages/kinecode/test/`.
- **Documentation Synchronization:** Whenever modifying files, APIs, parameters or directory structures, update `README.md` and `CHANGELOG.md` in accordance with `.agents/rules/documentation-sync.md`.
