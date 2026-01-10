/**
 * SVG to bitmap rendering using resvg-wasm
 * 
 * Note: When running as a dynamically loaded script in CADit, the WASM module
 * is loaded from esm.sh CDN since Vite's ?url import syntax isn't available.
 */

import * as resvg from '@resvg/resvg-wasm';
import { svgDataUrlToString, ensureSvgNamespace } from './utils';

// Hardcoded version for WASM URL - update when upgrading @resvg/resvg-wasm dependency
const RESVG_VERSION = '2.6.2';

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize resvg WASM module.
 * Fetches the WASM binary from esm.sh CDN to work in dynamically loaded scripts.
 * 
 * Safe to call multiple times - subsequent calls return immediately.
 * If initialization fails, subsequent calls will retry.
 */
async function initializeResvgWasm(): Promise<void> {
  if (wasmInitialized) return;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      // Fetch WASM from esm.sh CDN
      const wasmUrl = `https://esm.sh/@resvg/resvg-wasm@${RESVG_VERSION}/index_bg.wasm`;
      await resvg.initWasm(fetch(wasmUrl));
      wasmInitialized = true;
    } catch (error) {
      // Reset promise so retry is possible
      wasmInitPromise = null;
      throw error;
    }
  })();

  return wasmInitPromise;
}

/**
 * Convert a Uint8Array to base64 string.
 * Works in Web Workers (no btoa binary limitation).
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Renders an SVG Data URL to a PNG Data URL using resvg-wasm.
 * Returns a data URL (required for potrace-ts traceDataUrl).
 */
export const renderSvgToBitmapDataUrl = async (
  svgDataUrl: string,
  options?: { maxWidth?: number }
): Promise<string> => {
  await initializeResvgWasm();

  let svgString = svgDataUrlToString(svgDataUrl);
  if (!svgString) {
    throw new Error("Could not decode SVG Data URL");
  }

  // Ensure SVG has xmlns attribute (required by resvg)
  svgString = ensureSvgNamespace(svgString);

  const opts: Record<string, unknown> = {};
  if (options?.maxWidth && options.maxWidth > 0 && isFinite(options.maxWidth)) {
    opts.fitTo = {
      mode: 'width',
      value: options.maxWidth
    };
  }

  const resvgInstance = new resvg.Resvg(svgString, opts);
  const pngData = resvgInstance.render();
  const pngBuffer = pngData.asPng(); // Uint8Array

  // Convert to base64 data URL (required for potrace-ts)
  const base64 = uint8ArrayToBase64(pngBuffer);
  return `data:image/png;base64,${base64}`;
};
