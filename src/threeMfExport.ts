/**
 * 3MF Export for image-extrude
 */

import type { Manifold } from '@cadit-app/manifold-3d/manifoldCAD';
// @ts-ignore - No type declarations available
import { to3dmodel, fileForContentTypes, FileForRelThumbnail } from '@jscadui/3mf-export';
import { strToU8, zipSync, Zippable } from 'fflate';

/**
 * Creates a 3MF ArrayBuffer from manifolds
 */
export async function create3mfArrayBuffer(manifolds: Manifold[]): Promise<ArrayBuffer> {
  const meshes = manifolds.map((m, index) => {
    const mesh = m.getMesh();
    return {
      id: String(index + 1),
      vertices: mesh.vertProperties,
      indices: mesh.triVerts,
      name: `Part-${index + 1}`,
    };
  });

  // Generate a single component with all meshes as children
  const components = [
    {
      id: meshes.length + 1,
      children: meshes.map((mesh) => ({ objectID: mesh.id })),
      name: 'ImageExtrude-Assembly',
    },
  ];

  // The main item should reference the component
  const items = components.map((component) => ({
    objectID: component.id,
  }));

  const header = {
    unit: 'millimeter',
    title: 'CADit Image Extrude',
    description: 'Image Extrude 3MF export',
    application: 'CADit',
  };

  const to3mf = {
    meshes,
    components,
    items,
    precision: 7,
    header,
  };

  // Generate the 3D model XML
  const model = to3dmodel(to3mf as any);

  // Package the 3MF file using fflate
  const fileForRelThumbnail = new FileForRelThumbnail();
  fileForRelThumbnail.add3dModel('3D/3dmodel.model');

  const files: Zippable = {};
  files['3D/3dmodel.model'] = strToU8(model);
  files[fileForContentTypes.name] = strToU8(fileForContentTypes.content);
  files[fileForRelThumbnail.name] = strToU8(fileForRelThumbnail.content);

  const zipData = zipSync(files);
  return zipData.buffer as ArrayBuffer;
}
