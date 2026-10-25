// KineCode — Public API Entry Point

// Core Primitives & Types
export * from './core/types.ts';
export * from './core/color.ts';
export * from './core/crc8.ts';
export * from './core/crypto.ts';
export * from './core/framing.ts';

// Generator
export { Generator, type GeneratorOptions } from './generator/Generator.ts';
export { KineCodeElement } from './generator/KineCodeElement.ts';
export { renderQrFrame, type RenderContext } from './generator/renderQrFrame.ts';

// Scanner
export { Scanner, type ScannerOptions, type ScannerDebugInfo } from './scanner/Scanner.ts';
export { KineScannerElement } from './scanner/KineScannerElement.ts';
export { CornerDetector, computeHomography, computeQuadArea, evaluateGuidance } from './scanner/CornerDetector.ts';
export { AntiStreamDetector } from './scanner/AntiStreamDetector.ts';
