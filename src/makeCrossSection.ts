/**
 * Create a CrossSection from image parameters
 * Exported for external use (e.g., embedding in other makers)
 */

import type { CrossSection } from '@cadit-app/manifold-3d/manifoldCAD';
import { ImageExtrudeParams } from './params';
import { sampleSvg, traceImage } from './tracing';
import { renderSvgToBitmapDataUrl } from './resvg';
import { fetchImageAsDataUrl } from './utils';

export type MakeCrossSectionOptions = {
  imageFile: ImageExtrudeParams['imageFile'];
  mode: 'trace' | 'sample';
  maxWidth?: number;
  despeckleSize?: number;
};

/**
 * Creates a CrossSection from image data
 * This is the main function for embedding in other makers
 */
export async function makeCrossSection(options: MakeCrossSectionOptions): Promise<CrossSection> {
  let { imageFile, mode, maxWidth, despeckleSize } = options;

  // If imageFile has imageUrl but not dataUrl, fetch and convert
  if (imageFile && !imageFile.dataUrl && imageFile.imageUrl) {
    imageFile = {
      ...imageFile,
      dataUrl: await fetchImageAsDataUrl(imageFile.imageUrl)
    };
  }

  if (!imageFile?.dataUrl) {
    throw new Error('No valid image file provided');
  }

  // Adjust mode if sample is selected for non-SVG
  if (mode === 'sample' && !imageFile.fileType?.includes('svg')) {
    console.warn('Sample mode selected for non-SVG file. Defaulting to Trace mode.');
    mode = 'trace';
  }

  if (mode === 'trace') {
    // if svg, render svg to bitmap and then trace
    const isSvg = imageFile.fileType?.includes('svg');
    const dataUrl = isSvg ? await renderSvgToBitmapDataUrl(imageFile.dataUrl) : imageFile.dataUrl;

    return traceImage(dataUrl, {
      maxWidth,
      despeckleSize
    });
  } else {
    // mode is 'sample', and fileType is guaranteed to be svg+xml
    return sampleSvg(imageFile.dataUrl, maxWidth);
  }
}
