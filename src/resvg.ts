/**
 * SVG to bitmap rendering using resvg-wasm
 * 
 * Note: When running as a dynamically loaded script in CADit, the WASM module
 * is loaded from esm.sh CDN since Vite's ?url import syntax isn't available.
 */

import * as resvg from '@resvg/resvg-wasm';
import { svgDataUrlToString } from './utils';

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
 * Renders an SVG Data URL to a PNG Data URL using resvg-wasm.
 */
export const renderSvgToBitmapDataUrl = async (
  svgDataUrl: string,
  options?: { maxWidth?: number }
): Promise<string> => {
  await initializeResvgWasm();

  const svgString = svgDataUrlToString(svgDataUrl);
  if (!svgString) {
    throw new Error("Could not decode SVG Data URL");
  }

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

  // Convert Uint8Array to proper ArrayBuffer for Blob
  const arrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength
  ) as ArrayBuffer;

  // Return blob URL (browser-compatible and more efficient)
  const blob = new Blob([arrayBuffer], { type: 'image/png' });
  return URL.createObjectURL(blob);
};
