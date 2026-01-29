/**
 * @cadit-app/image-extrude
 * 
 * Extrude 3D shapes from SVG or bitmap images.
 * Uses the defineParams API from @cadit-app/script-params.
 */

import { defineParams, createSceneOutput, polygon } from '@cadit-app/script-params';
import type { SceneOutput, PolygonInput, PathPoint2D } from '@cadit-app/script-params';
import { imageExtrudeParamsSchema, ImageExtrudeParams, ImageFileValue } from './params';
import { sampleSvgToPolygons, traceImageToPolygons, CompoundPolygon } from './tracing';
import { renderSvgToBitmapDataUrl } from './resvg';
import { fetchImageAsDataUrl } from './utils';

// Re-export for external use
export { sampleSvgToPolygons, traceImageToPolygons, CompoundPolygon } from './tracing';
export { renderSvgToBitmapDataUrl } from './resvg';
export { makeCrossSection } from './makeCrossSection';

/**
 * Main entry point using defineParams
 * Returns 2D shapes (SceneOutput) that CADit will extrude
 */
export default defineParams({
  params: imageExtrudeParamsSchema as any,
  main: async (params): Promise<SceneOutput> => {
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
        return createSceneOutput([]);
      }
    }

    if (!imageFile || !imageFile.dataUrl) {
      console.warn('No valid image file provided.');
      return createSceneOutput([]);
    }

    // Adjust mode if sample is selected for non-SVG
    if (mode === 'sample' && !imageFile.fileType?.includes('svg')) {
      console.warn('Sample mode selected for non-SVG file. Defaulting to Trace mode.');
      mode = 'trace';
    }

    let compoundPolygons: CompoundPolygon[] | undefined;
    try {
      if (mode === 'trace') {
        // if svg, render svg to bitmap and then trace
        const isSvg = imageFile.fileType?.includes('svg');
        const dataUrl = isSvg ? await renderSvgToBitmapDataUrl(imageFile.dataUrl) : imageFile.dataUrl;

        compoundPolygons = await traceImageToPolygons(dataUrl, {
          maxWidth: typedParams.maxWidth,
          despeckleSize: typedParams.despeckleSize,
          threshold: typedParams.threshold || undefined, // 0 means auto
          invert: typedParams.invert
        });
      } else {
        // mode is 'sample', and fileType is guaranteed to be svg+xml
        compoundPolygons = await sampleSvgToPolygons(imageFile.dataUrl, typedParams.maxWidth);
      }
    } catch (error) {
      console.error(`Error during image processing (mode: ${mode}):`, error);
      return createSceneOutput([]);
    }

    if (!compoundPolygons || compoundPolygons.length === 0) {
      console.error('No polygons generated');
      return createSceneOutput([]);
    }

    // Convert compound polygons to CADit polygon shapes with holes
    const shapes: PolygonInput[] = compoundPolygons.map((compound) => {
      const points: PathPoint2D[] = compound.outer.map(([x, y]) => ({ x, y }));
      const holes: PathPoint2D[][] | undefined = compound.holes.length > 0
        ? compound.holes.map(hole => hole.map(([x, y]) => ({ x, y })))
        : undefined;

      return polygon(points, {
        height,
        fill: true,
        holes,
      });
    });

    return createSceneOutput(shapes);
  },
});
