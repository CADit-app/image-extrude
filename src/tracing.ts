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
 * A compound path with an outer boundary and optional holes.
 * Used for CADit compound path shapes.
 */
export type CompoundPolygon = {
  outer: [number, number][];
  holes: [number, number][][];
};

/**
 * Converts SVG content to polygons.
 * @param svgContent The SVG content string
 * @param maxError Maximum error for polygon sampling
 * @param flipY Whether to flip the Y axis. Set to true for 3D (Y-up), false for 2D (Y-down like SVG)
 */
export const svgContentToPolygons = async (
  svgContent: string,
  maxError: number,
  flipY: boolean = true
): Promise<[number, number][][]> => {
  // Sample the SVG into polygons
  const polygons = await svgToPolygons(svgContent, { maxError });

  // Optionally flip Y-axis: SVG uses Y-down, 3D modeling uses Y-up, CADit 2D uses Y-down
  const processedPolygons = polygons.map((polygon) => {
    return polygon.points.map(([x, y]) => [x, flipY ? -y : y]) as [number, number][];
  });

  return processedPolygons;
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

// =============================================================================
// Compound polygon functions (for scene output shapes with holes)
// =============================================================================

/**
 * Center compound polygons around origin.
 */
function centerCompoundPolygons(compounds: CompoundPolygon[]): CompoundPolygon[] {
  if (compounds.length === 0) return compounds;
  
  // Find bounding box across all polygons
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { outer, holes } of compounds) {
    for (const [x, y] of outer) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    for (const hole of holes) {
      for (const [x, y] of hole) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Translate all polygons
  return compounds.map(({ outer, holes }) => ({
    outer: outer.map(([x, y]) => [x - centerX, y - centerY] as [number, number]),
    holes: holes.map(hole => 
      hole.map(([x, y]) => [x - centerX, y - centerY] as [number, number])
    ),
  }));
}

/**
 * Converts SVG content to compound polygons with proper hole detection.
 * Uses Manifold's CrossSection with even-odd fill rule, then decompose() to
 * get individual shapes where each has an outer boundary and its holes.
 * 
 * This is the correct way to handle text and complex shapes where internal
 * paths should be holes (like the inside of letters A, B, D, O, etc.)
 */
export const svgContentToCompoundPolygons = async (
  svgContent: string,
  maxWidth?: number,
  maxError: number = 0.01
): Promise<CompoundPolygon[]> => {
  // Get polygons with Y flipped for Manifold (Y-up coordinate system)
  let polygons = await svgContentToPolygons(svgContent, maxError, true);
  
  if (polygons.length === 0) {
    return [];
  }

  // Create CrossSection with even-odd fill rule - this handles overlapping paths correctly
  let crossSection = new CrossSection(polygons, "EvenOdd").simplify(maxError);
  
  // Scale if needed
  if (maxWidth) {
    const boundingBox = crossSection.bounds();
    const width = boundingBox.max[0] - boundingBox.min[0];
    if (width > 0) {
      const scaleFactor = maxWidth / width;
      const scaledError = maxError / scaleFactor;
      
      // Re-sample with adjusted error for better quality at target size
      polygons = await svgContentToPolygons(svgContent, scaledError, true);
      crossSection = new CrossSection(polygons, "EvenOdd").simplify(scaledError);
      crossSection = crossSection.scale([scaleFactor, scaleFactor]);
    }
  }
  
  // Decompose into individual connected components (each outer shape with its holes)
  const decomposed = crossSection.decompose();
  
  // Convert each decomposed CrossSection to CompoundPolygon
  // toPolygons() returns [outerPath, ...holes] for each decomposed section
  const compounds: CompoundPolygon[] = decomposed.map(section => {
    const sectionPolygons = section.toPolygons();
    
    if (sectionPolygons.length === 0) {
      return { outer: [], holes: [] };
    }
    
    // First polygon is the outer boundary, rest are holes
    // Flip Y back to CADit 2D coordinate system (Y-down)
    const outer = sectionPolygons[0].map(([x, y]) => [x, -y] as [number, number]);
    const holes = sectionPolygons.slice(1).map(hole =>
      hole.map(([x, y]) => [x, -y] as [number, number])
    );
    
    return { outer, holes };
  }).filter(c => c.outer.length > 0);
  
  // Center the compound polygons
  return centerCompoundPolygons(compounds);
};

/**
 * Samples an SVG data URL and returns compound polygons with proper hole detection.
 * Uses Manifold's CrossSection.decompose() to correctly identify outer shapes and holes.
 */
export const sampleSvgToPolygons = async (
  svgDataUrl: string,
  maxWidth?: number
): Promise<CompoundPolygon[]> => {
  const svgContent = svgDataUrlToString(svgDataUrl);
  if (!svgContent) {
    throw new Error('Failed to decode SVG data URL');
  }
  return svgContentToCompoundPolygons(svgContent, maxWidth);
};

/**
 * Traces a bitmap image and returns compound polygons with proper hole detection.
 * Uses Manifold's CrossSection.decompose() to correctly identify outer shapes and holes.
 */
export const traceImageToPolygons = async (imageDataUrl: string, options: {
  maxWidth?: number
  despeckleSize?: number
  threshold?: number
  invert?: boolean
}): Promise<CompoundPolygon[]> => {
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
  
  // Convert SVG to compound polygons with hole detection
  return svgContentToCompoundPolygons(svgContent, options.maxWidth);
};
