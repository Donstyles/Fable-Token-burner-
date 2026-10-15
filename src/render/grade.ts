import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';

/**
 * The grade from the look references: soft bloom on lamps and windows, cool shadows and
 * warm highlights, a touch of contrast and a gentle vignette.
 */
export interface GradeSettings {
  bloom: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  bloomKernel: number;
  bloomScale: number;
  /** 0 disables. */
  vignette: number;
  contrast: number;
  exposure: number;
  /** Split toning strength, 0–100: shadows toward blue, highlights toward orange. */
  splitTone: number;
  /** -100..100 */
  saturation: number;
}

export const DEFAULT_GRADE: GradeSettings = {
  bloom: true,
  bloomThreshold: 0.4,
  bloomWeight: 0,
  bloomKernel: 48,
  bloomScale: 0.5,
  vignette: 0.6,
  contrast: 1.0,
  exposure: 0.85,
  splitTone: 11,
  saturation: 0,
};

export class GradePass {
  private readonly pipeline: DefaultRenderingPipeline;
  private readonly curves = new ColorCurves();
  private current: GradeSettings;

  constructor(scene: Scene, camera: Camera, initial: GradeSettings = DEFAULT_GRADE) {
    this.current = { ...initial };
    this.pipeline = new DefaultRenderingPipeline('grade', false, scene, [camera]);
    this.pipeline.fxaaEnabled = false;
    this.pipeline.samples = 1;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0.015, 0.03, 0);
    this.pipeline.imageProcessing.colorCurves = this.curves;
    this.pipeline.imageProcessing.colorCurvesEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = false;
    this.push();
  }

  get settings(): GradeSettings {
    return { ...this.current };
  }

  apply(next: Partial<GradeSettings>): void {
    this.current = { ...this.current, ...next };
    this.push();
  }

  private push(): void {
    const s = this.current;
    const p = this.pipeline;
    p.bloomEnabled = s.bloom;
    p.bloomThreshold = s.bloomThreshold;
    p.bloomWeight = s.bloomWeight;
    p.bloomKernel = s.bloomKernel;
    p.bloomScale = s.bloomScale;
    const ip = p.imageProcessing;
    ip.vignetteEnabled = s.vignette > 0;
    ip.vignetteWeight = s.vignette;
    ip.contrast = s.contrast;
    ip.exposure = s.exposure;
    this.curves.shadowsHue = 230;
    this.curves.shadowsDensity = s.splitTone;
    this.curves.highlightsHue = 35;
    this.curves.highlightsDensity = s.splitTone * 0.7;
    this.curves.globalSaturation = s.saturation;
  }

  dispose(): void {
    this.pipeline.dispose();
  }
}
