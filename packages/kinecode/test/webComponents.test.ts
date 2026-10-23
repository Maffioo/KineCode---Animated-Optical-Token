import { describe, it, expect, beforeEach } from 'vitest';

describe('Web Components Custom Elements Registration', () => {
  beforeEach(() => {
    // Setup minimal DOM mocks in Node test environment
    if (typeof globalThis.HTMLElement === 'undefined') {
      (globalThis as any).HTMLElement = class {};
    }
  });

  it('registers <kine-code> custom element with KineCodeElement constructor', async () => {
    const registry = new Map<string, any>();
    (globalThis as any).customElements = {
      get: (name: string) => registry.get(name),
      define: (name: string, constructor: any) => registry.set(name, constructor)
    };

    const { KineCodeElement } = await import('../src/generator/KineCodeElement.ts');
    expect(KineCodeElement).toBeDefined();
    expect(registry.get('kine-code')).toBe(KineCodeElement);
  });

  it('registers <kine-scanner> custom element with KineScannerElement constructor', async () => {
    const registry = new Map<string, any>();
    (globalThis as any).customElements = {
      get: (name: string) => registry.get(name),
      define: (name: string, constructor: any) => registry.set(name, constructor)
    };

    const { KineScannerElement } = await import('../src/scanner/KineScannerElement.ts');
    expect(KineScannerElement).toBeDefined();
    expect(registry.get('kine-scanner')).toBe(KineScannerElement);
  });
});
