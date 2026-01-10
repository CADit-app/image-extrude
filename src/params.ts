/**
 * Parameter schema for the Image Extrude generator.
 */

/**
 * Value type for image parameters.
 * Matches the ImageFileValue type from @cadit-app/script-params.
 * TODO: Import from script-params once version with ImageFileValue is published.
 */
export interface ImageFileValue {
  /** Remote URL to fetch the image from (e.g., HTTP URL or relative path). */
  imageUrl?: string;
  /** Base64-encoded data URL of the image content. */
  dataUrl?: string;
  /** MIME type of the image (e.g., 'image/svg+xml', 'image/png'). */
  fileType?: string;
  /** Original filename of the image. */
  fileName?: string;
}

// Default image - CookieCAD logo from GitHub via jsdelivr CDN
const defaultImageUrl = 'https://cdn.jsdelivr.net/gh/CADit-app/image-extrude@master/images/cookiecad-logo-dark.svg';

export const imageExtrudeParamsSchema = {
  mode: {
    type: 'choice' as const,
    label: 'Mode',
    options: [
      { value: 'trace', label: 'Trace' },
      { value: 'sample', label: 'Sample (SVG only)' },
    ],
    default: 'trace',
  },
  imageFile: {
    type: 'image' as const,
    label: 'Image File',
    default: {
      imageUrl: defaultImageUrl,
      dataUrl: '',
      fileType: 'image/svg+xml',
      fileName: 'cookiecad-logo-dark.svg'
    } as ImageFileValue,
  },
  height: {
    type: 'number' as const,
    label: 'Extrusion Height (mm)',
    default: 1,
    min: 0.1,
  },
  maxWidth: {
    type: 'number' as const,
    label: 'Maximum Width (mm)',
    default: 50,
    min: 0.1,
  },
  despeckleSize: {
    type: 'number' as const,
    label: 'Despeckle Size (Tracing only)',
    default: 2,
    min: 0.1,
  },
  threshold: {
    type: 'number' as const,
    label: 'Threshold (0 = auto, 1-255)',
    default: 0,
    min: 0,
    max: 255,
  },
  invert: {
    type: 'switch' as const,
    label: 'Invert (for light-on-dark images)',
    default: false,
  },
};

export type ImageExtrudeParams = {
  mode: 'trace' | 'sample';
  imageFile: ImageFileValue;
  height: number;
  maxWidth: number;
  despeckleSize: number;
  threshold: number;
  invert: boolean;
};
