/**
 * Type declarations for potrace-js
 * Browser-compatible bitmap tracing library
 */

declare module 'potrace-js' {
  export interface TraceOptions {
    turnpolicy?: 'right' | 'left' | 'minority' | 'majority' | 'black' | 'white';
    turdsize?: number;
    optcurve?: boolean;
    alphamax?: number;
    opttolerance?: number;
  }

  export interface PathList {
    length: number;
    [index: number]: {
      curve: {
        n: number;
        tag: string[];
        c: Array<{ x: number; y: number }>;
      };
    };
  }

  export function traceUrl(url: string, options?: TraceOptions): Promise<PathList>;
  export function traceImage(image: HTMLImageElement, options?: TraceOptions): PathList;
  export function traceCanvas(canvas: HTMLCanvasElement, options?: TraceOptions): PathList;
  export function getSVG(pathList: PathList, size: number, type?: 'curve' | 'fill'): string;
  export function getPaths(pathList: PathList): string[];
}
