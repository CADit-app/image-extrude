/**
 * @cadit-app/image-extrude
 * 
 * Extrude 3D shapes from SVG or bitmap images.
 * Uses the defineParams API from @cadit-app/script-params.
 */

import { defineParams } from '@cadit-app/script-params';
import type { Manifold, CrossSection } from '@cadit-app/manifold-3d/manifoldCAD';
import { imageExtrudeParamsSchema, ImageExtrudeParams, ImageFileValue } from './params';
import { sampleSvg, traceImage } from './tracing';
import { renderSvgToBitmapDataUrl } from './resvg';
import { fetchImageAsDataUrl } from './utils';
import { createEmptyManifold } from './manifoldUtils';

// Re-export for external use
export { sampleSvg, traceImage } from './tracing';
export { renderSvgToBitmapDataUrl } from './resvg';
export { makeCrossSection } from './makeCrossSection';

/**
 * Main entry point using defineParams
 */
export default defineParams({
  params: imageExtrudeParamsSchema as any,
  main: async (params): Promise<Manifold> => {
    const typedParams = params as unknown as ImageExtrudeParams;
    let { mode, height } = typedParams;
    let imageFile: ImageFileValue | undefined = typedParams.imageFile;

    // If imageFile has imageUrl but not dataUrl, fetch and convert to dataUrl
    if (imageFile && !imageFile.dataUrl && imageFile.imageUrl) {
      try {
        imageFile = {
          ...imageFile,
          dataUrl: await fetchImageAsDataUrl(imageFile.imageUrl)
        };
      } catch (err) {
        console.warn('Failed to fetch imageUrl:', err);
        return createEmptyManifold();
      }
    }

    if (!imageFile || !imageFile.dataUrl) {
      console.warn('No valid image file provided.');
      return createEmptyManifold();
    }

    // Adjust mode if sample is selected for non-SVG
    if (mode === 'sample' && !imageFile.fileType?.includes('svg')) {
      console.warn('Sample mode selected for non-SVG file. Defaulting to Trace mode.');
      mode = 'trace';
    }

    let crossSection: CrossSection;
    try {
      if (mode === 'trace') {
        // if svg, render svg to bitmap and then trace
        const isSvg = imageFile.fileType?.includes('svg');
        const dataUrl = isSvg ? await renderSvgToBitmapDataUrl(imageFile.dataUrl) : imageFile.dataUrl;

        crossSection = await traceImage(dataUrl, {
          maxWidth: typedParams.maxWidth,
          despeckleSize: typedParams.despeckleSize
        });
      } else {
        // mode is 'sample', and fileType is guaranteed to be svg+xml
        crossSection = await sampleSvg(imageFile.dataUrl, typedParams.maxWidth);
      }
    } catch (error) {
      console.error(`Error during image processing (mode: ${mode}):`, error);
      return createEmptyManifold();
    }

    return crossSection.extrude(height);
  },
});
