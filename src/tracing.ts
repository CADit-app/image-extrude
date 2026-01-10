/**
 * Image tracing and SVG sampling utilities
 * 
 * Uses @cadit-app/potrace-ts for bitmap tracing. Works in browsers and Web Workers.
 */

import { svgToPolygons } from '@cadit-app/svg-sampler';
import { CrossSection } from '@cadit-app/manifold-3d/manifoldCAD';
import { traceDataUrl, getSVG, THRESHOLD_AUTO } from '@cadit-app/potrace-ts';
import { svgDataUrlToString } from './utils';
import { centerCrossSection } from './crossSectionUtils';

/**
 * Converts SVG content to polygons
 */
export const svgContentToPolygons = async (
  svgContent: string,
  maxError: number
) => {
  // Sample the SVG into polygons
  const polygons = await svgToPolygons(svgContent, { maxError });

  // Flip the Y-axis for SVG paths (SVG uses Y-down, but 3D modeling uses Y-up)
  const flippedPolygons = polygons.map((polygon) => {
    return polygon.points.map(([x, y]) => [x, -y]) as [number, number][];
  });

  return flippedPolygons;
};

/**
 * Converts an SVG string to a CrossSection with optional scaling
 */
export const svgStringToCrossSection = async (
  svgContent: string,
  maxWidth?: number,
  maxError: number = 0.01
): Promise<CrossSection> => {
  const polygons = await svgContentToPolygons(svgContent, maxError);

  const crossSection = new CrossSection(polygons, 'EvenOdd').simplify(maxError);
  if (!maxWidth) return crossSection;

  // Check the width of the resulting CrossSection
  const boundingBox = crossSection.bounds();
  const width = boundingBox.max[0] - boundingBox.min[0];
  const scaleFactor = maxWidth / width;
  const scaledError = maxError / scaleFactor;

  // Sample again with new error
  const newPolygons = await svgContentToPolygons(svgContent, scaledError);
  const newCrossSection = new CrossSection(newPolygons, 'EvenOdd').simplify(scaledError);
  return newCrossSection.scale([scaleFactor, scaleFactor]);
};

/**
 * Samples an SVG data URL and returns a centered CrossSection
 */
export const sampleSvg = async (svgDataUrl: string, maxWidth?: number): Promise<CrossSection> => {
  const svgContent = svgDataUrlToString(svgDataUrl);
  if (!svgContent) {
    throw new Error('Failed to parse SVG data URL');
  }
  const crossSection = await svgStringToCrossSection(svgContent, maxWidth);
  return centerCrossSection(crossSection);
};

/**
 * Traces a bitmap image and returns a centered CrossSection.
 * Uses @cadit-app/potrace-ts with automatic threshold (Otsu's method).
 * 
 * Transparent pixels are blended with white background before processing,
 * matching the behavior of the original node-potrace library.
 */
export const traceImage = async (
  imageDataUrl: string,
  options: {
    maxWidth?: number;
    despeckleSize?: number;
    threshold?: number;
    /** 
     * Invert the tracing (for light content on dark backgrounds).
     * Default is false (trace dark pixels on light/transparent background).
     */
    invert?: boolean;
  } = {}
): Promise<CrossSection> => {
  // Use potrace-ts traceDataUrl which handles decoding, auto-threshold, and tracing
  const paths = traceDataUrl(imageDataUrl, {
    threshold: options.threshold ?? THRESHOLD_AUTO,
    invert: options.invert,
    turnpolicy: 'black',
    turdsize: options.despeckleSize ?? 2,
    optcurve: true,
    alphamax: 1,
    opttolerance: 0.2
  });

  if (paths.length === 0) {
    throw new Error('Potrace produced no paths. Check threshold or image contrast.');
  }

  // Generate SVG from traced paths
  const svgContent = getSVG(paths, 1);

  // Convert SVG to CrossSection
  const crossSection = await svgStringToCrossSection(svgContent, options.maxWidth);
  return centerCrossSection(crossSection);
};
