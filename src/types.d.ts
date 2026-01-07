declare module 'potrace' {
  interface PotraceOptions {
    turdSize?: number;
    turnPolicy?: string;
    alphaMax?: number;
    optCurve?: boolean;
    optTolerance?: number;
    threshold?: number;
    blackOnWhite?: boolean;
    color?: string;
    background?: string;
  }

  class Potrace {
    constructor(options?: PotraceOptions);
    loadImage(source: string | Buffer, callback: (err: Error | null) => void): void;
    getSVG(): string;
    getPathTag(): string;
  }

  function trace(source: string | Buffer, options?: PotraceOptions, callback?: (err: Error | null, svg: string) => void): void;
  function posterize(source: string | Buffer, options?: PotraceOptions, callback?: (err: Error | null, svg: string) => void): void;

  export { Potrace, trace, posterize, PotraceOptions };
}

declare module '@jscadui/3mf-export' {
  export interface ZipWriter {
    files: Record<string, Uint8Array>;
    add(path: string, data: string): void;
  }

  export interface Mesh3MF {
    id: string;
    vertices: number[];
    indices: number[];
  }

  export function create3mf(zipWriter: ZipWriter, meshes: Mesh3MF[]): void;
}
