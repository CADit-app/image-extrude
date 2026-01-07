/**
 * Parameter schema for the Image Extrude generator.
 */

// Default SVG - a simple star shape
const defaultSvgDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cG9seWdvbiBwb2ludHM9IjUwLDUgNjEsMzkgOTcsMzkgNjgsMjIgNzksOTUgNTAsNzAgMjEsOTUgMzIsNjIgMywzOSAzOSwzOSIgZmlsbD0iYmxhY2siLz48L3N2Zz4=';

export interface ImageFileValue {
  imageUrl?: string;
  dataUrl?: string;
  fileType?: string;
  fileName?: string;
}

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
      imageUrl: '',
      dataUrl: defaultSvgDataUrl,
      fileType: 'image/svg+xml',
      fileName: 'star.svg'
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
};

export type ImageExtrudeParams = {
  mode: 'trace' | 'sample';
  imageFile: ImageFileValue;
  height: number;
  maxWidth: number;
  despeckleSize: number;
};
