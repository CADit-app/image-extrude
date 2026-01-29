# @cadit-app/image-extrude

Extrude 3D shapes from SVG or bitmap images. Supports both tracing (for raster images) and sampling (for SVGs).

![Image Extrude Preview](images/preview.png)

## Features

- **Trace mode**: Convert any bitmap image (PNG, JPG) to 3D by tracing edges (browser only)
- **Sample mode**: High-fidelity conversion of SVG files to 3D
- **Configurable size**: Set maximum width to control output dimensions
- **Despeckle**: Remove small artifacts during tracing
- **CLI support**: Generate GLB and 3MF files from command line

## Installation

```bash
npm install @cadit-app/image-extrude
```

## Usage

### As a CADit Script

Open this script in [CADit](https://cadit.app/design/ohQ58mpwMpdX5qC) and edit parameters inside the browser.

### CLI Usage

```bash
# Generate GLB from default Cookiecad logo
npx tsx cli.ts output.glb

# Generate from a specific image
npx tsx cli.ts output.glb --image=logo.svg --height=2 --maxWidth=50

# Generate 3MF
npx tsx cli.ts output.3mf --image=photo.png --mode=trace
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--image=<path>` | Path to image file (SVG, PNG, JPG) | Built-in Cookiecad logo |
| `--height=<mm>` | Extrusion height in mm | 1 |
| `--maxWidth=<mm>` | Maximum width in mm | 50 |
| `--mode=<trace\|sample>` | Processing mode | trace |
| `--despeckle=<size>` | Despeckle size for tracing | 2 |

### Programmatic Usage

```typescript
import imageExtrude from '@cadit-app/image-extrude';

// Use the defineParams API - returns 2D shapes (SceneOutput)
const result = await imageExtrude.main({
  mode: 'trace',
  imageFile: {
    dataUrl: 'data:image/png;base64,...',
    fileType: 'image/png',
    fileName: 'logo.png'
  },
  height: 2,
  maxWidth: 50,
  despeckleSize: 2,
  threshold: 0,
  invert: false
});

// result is a SceneOutput containing polygon shapes
console.log(result.objects); // Array of polygon shapes with holes
```

### Creating CrossSections for Embedding

```typescript
import { makeCrossSection } from '@cadit-app/image-extrude';

const crossSection = await makeCrossSection({
  imageFile: { dataUrl: '...', fileType: 'image/svg+xml' },
  mode: 'sample',
  maxWidth: 30
});

// Use in your own maker - extrude to get a Manifold
const manifold = crossSection.extrude(5);
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | `'trace' \| 'sample'` | Trace for bitmaps, Sample for SVGs |
| `imageFile` | `object` | Image data with dataUrl, fileType, fileName |
| `height` | `number` | Extrusion height in mm |
| `maxWidth` | `number` | Maximum width in mm |
| `despeckleSize` | `number` | Remove spots smaller than this (trace only) |

## License

MIT
