/**
 * Manifold utility functions
 */

import { Manifold, CrossSection } from '@cadit-app/manifold-3d/manifoldCAD';

/**
 * Creates an empty manifold (a very small cube that will be invisible)
 */
export function createEmptyManifold(): Manifold {
  // Create a tiny box that's essentially invisible
  return CrossSection.square([0.001, 0.001], true).extrude(0.001);
}
