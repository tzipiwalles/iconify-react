declare module "potrace" {
  interface PotraceParams {
    threshold?: number
    color?: string
    background?: string
    turdSize?: number
    optTolerance?: number
    turnPolicy?: string
    alphaMax?: number
    optCurve?: boolean
    blackOnWhite?: boolean
  }

  interface PosterizeParams {
    steps?: number
    // fillStrategy: "dominant" | "mean" | "median" | "spread"
    fillStrategy?: string
    // rangeDistribution: "auto" | "equal"  
    rangeDistribution?: string
    threshold?: number
    color?: string
    background?: string
    turdSize?: number
    optTolerance?: number
    turnPolicy?: string
    alphaMax?: number
    optCurve?: boolean
    blackOnWhite?: boolean
  }

  type TraceCallback = (err: Error | null, svg: string) => void

  export function trace(
    data: Buffer | string,
    params: PotraceParams,
    callback: TraceCallback
  ): void

  export function trace(
    data: Buffer | string,
    callback: TraceCallback
  ): void

  export function posterize(
    data: Buffer | string,
    params: PosterizeParams,
    callback: TraceCallback
  ): void

  export function posterize(
    data: Buffer | string,
    callback: TraceCallback
  ): void
}
