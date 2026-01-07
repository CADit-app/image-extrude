/**
 * CrossSection utility functions
 */

import { CrossSection } from '@cadit-app/manifold-3d/manifoldCAD';

/**
 * Centers a CrossSection at the origin based on its bounding box
 */
export function centerCrossSection(crossSection: CrossSection): CrossSection {
  const bounds = crossSection.bounds();
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  return crossSection.translate([-centerX, -centerY]);
}

/**
 * Scales a CrossSection to fit within a maximum size while maintaining aspect ratio
 */
export function scaleToMaxSize(crossSection: CrossSection, maxSize: number): CrossSection {
  const bounds = crossSection.bounds();
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const maxDim = Math.max(width, height);
  
  if (maxDim <= 0) return crossSection;
  
  const scale = maxSize / maxDim;
  return crossSection.scale([scale, scale]);
}
