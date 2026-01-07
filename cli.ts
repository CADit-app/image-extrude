#!/usr/bin/env npx tsx
/**
 * CLI for @cadit-app/image-extrude
 * 
 * Usage:
 *   npx tsx cli.ts [output.glb|output.3mf] [options]
 * 
 * Examples:
 *   npx tsx cli.ts output.glb
 *   npx tsx cli.ts output.3mf --image=logo.svg --height=2
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { parseArgs } from 'util';
import type { ImageExtrudeParams } from './src/params';

const SUPPORTED_FORMATS = ['.glb', '.3mf'] as const;
type OutputFormat = typeof SUPPORTED_FORMATS[number];

// Parse command line arguments
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    image: { type: 'string', short: 'i' },
    height: { type: 'string', short: 'h' },
    maxWidth: { type: 'string', short: 'w' },
    mode: { type: 'string', short: 'm' },
    despeckle: { type: 'string', short: 'd' },
    help: { type: 'boolean' },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
@cadit-app/image-extrude CLI

Usage: npx tsx cli.ts <output.[glb|3mf]> [options]

Options:
  -i, --image <path>        Path to image file (SVG, PNG, JPG)
  -h, --height <mm>         Extrusion height in mm (default: 1)
  -w, --maxWidth <mm>       Maximum width in mm (default: 50)
  -m, --mode <trace|sample> Processing mode (default: trace)
  -d, --despeckle <size>    Despeckle size for tracing (default: 2)
  --help                    Show this help

Examples:
  npx tsx cli.ts output.glb
  npx tsx cli.ts output.glb --image logo.svg --height 2
  npx tsx cli.ts output.3mf --image photo.png --mode trace
`);
  process.exit(0);
}

const outputFile = positionals[0];
const ext = extname(outputFile).toLowerCase() as OutputFormat;

if (!SUPPORTED_FORMATS.includes(ext)) {
  console.error(`Error: Output file must have one of these extensions: ${SUPPORTED_FORMATS.join(', ')}`);
  console.error(`Got: ${ext}`);
  process.exit(1);
}

async function main() {
  console.log('Initializing manifold...');
  
  // Initialize manifold-3d
  const manifold = await import('@cadit-app/manifold-3d');
  await manifold.default();
  
  // Now import the maker
  const { default: imageExtrudeMaker } = await import('./src/main');
  const { imageExtrudeParamsSchema } = await import('./src/params');
  
  console.log('Generating image extrusion...');
  
  // Build params from defaults and CLI options
  const defaultParams: Partial<ImageExtrudeParams> = {};
  for (const [key, param] of Object.entries(imageExtrudeParamsSchema)) {
    (defaultParams as any)[key] = (param as { default: unknown }).default;
  }
  
  // Load default image from images folder if no image specified
  const defaultImagePath = resolve(import.meta.dirname, 'images', 'cookiecad-logo-dark.svg');
  const imagePath = values.image && existsSync(values.image) ? values.image : defaultImagePath;
  
  // Override with CLI options
  if (values.height) {
    defaultParams.height = parseFloat(values.height);
  }
  if (values.maxWidth) {
    defaultParams.maxWidth = parseFloat(values.maxWidth);
  }
  // Default to 'sample' mode for CLI (trace requires additional WASM setup for non-SVG)
  if (values.mode && (values.mode === 'trace' || values.mode === 'sample')) {
    defaultParams.mode = values.mode;
  } else if (!values.mode && imagePath.endsWith('.svg')) {
    defaultParams.mode = 'sample';  // Default to sample for SVGs in CLI
  }
  if (values.despeckle) {
    defaultParams.despeckleSize = parseFloat(values.despeckle);
  }
  if (existsSync(imagePath)) {
    const imageData = readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const imageExt = extname(imagePath).toLowerCase();
    const mimeType = imageExt === '.svg' ? 'image/svg+xml' : 
                     imageExt === '.png' ? 'image/png' : 
                     imageExt === '.jpg' || imageExt === '.jpeg' ? 'image/jpeg' : 
                     'application/octet-stream';
    defaultParams.imageFile = {
      dataUrl: `data:${mimeType};base64,${base64}`,
      fileType: mimeType,
      fileName: basename(imagePath)
    };
  }
  
  console.log('Parameters:', {
    mode: defaultParams.mode,
    height: defaultParams.height,
    maxWidth: defaultParams.maxWidth,
    despeckleSize: defaultParams.despeckleSize,
    hasImage: !!(defaultParams.imageFile as any)?.dataUrl
  });
  
  // Generate the model
  const result = await imageExtrudeMaker(defaultParams as any);
  
  if (ext === '.glb') {
    // Export as GLB
    const mesh = result.getMesh();
    
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const document = new Document();
    const buffer = document.createBuffer();
    const scene = document.createScene();
    const node = document.createNode();
    scene.addChild(node);
    
    // Create mesh
    const primitive = document.createPrimitive();
    
    // Position accessor
    const positions = new Float32Array(mesh.vertProperties);
    const positionAccessor = document.createAccessor()
      .setType('VEC3')
      .setBuffer(buffer)
      .setArray(positions);
    primitive.setAttribute('POSITION', positionAccessor);
    
    // Index accessor
    const indices = new Uint32Array(mesh.triVerts);
    const indexAccessor = document.createAccessor()
      .setType('SCALAR')
      .setBuffer(buffer)
      .setArray(indices);
    primitive.setIndices(indexAccessor);
    
    // Material
    const material = document.createMaterial()
      .setBaseColorFactor([0.2, 0.8, 0.6, 1.0]);
    primitive.setMaterial(material);
    
    const gltfMesh = document.createMesh().addPrimitive(primitive);
    node.setMesh(gltfMesh);
    
    const io = new NodeIO();
    const glb = await io.writeBinary(document);
    writeFileSync(resolve(outputFile), glb);
    console.log(`Wrote ${outputFile}`);
    
  } else if (ext === '.3mf') {
    // Export as 3MF
    const { create3mfArrayBuffer } = await import('./src/threeMfExport');
    const buffer = await create3mfArrayBuffer([result]);
    writeFileSync(resolve(outputFile), Buffer.from(buffer));
    console.log(`Wrote ${outputFile}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
