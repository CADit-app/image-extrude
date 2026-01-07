/**
 * SVG to bitmap rendering using resvg-wasm
 */

import * as resvg from '@resvg/resvg-wasm';
import { svgDataUrlToString } from './utils';

let wasmInitialized = false;

/**
 * Initialize resvg WASM module
 * In CLI context, we need to load from file system
 * In browser context (via bundler), the WASM is loaded differently
 */
async function initializeResvgWasm() {
  if (wasmInitialized) return;
  
  // For CLI usage, load WASM from node_modules
  const { readFile } = await import('fs/promises');
  const { resolve, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  
  // Find the wasm file in node_modules
  const wasmPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../node_modules/@resvg/resvg-wasm/index_bg.wasm'
  );
  
  const wasmBuffer = await readFile(wasmPath);
  await resvg.initWasm(wasmBuffer);
  wasmInitialized = true;
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
  const pngBuffer = pngData.asPng();

  // Convert to data URL
  const base64 = Buffer.from(pngBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
};
