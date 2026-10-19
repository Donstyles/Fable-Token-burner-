/**
 * Command-line flags for the Meshy steps the pipeline uses (tools/lib/meshy.ts): a concept
 * picture from text, and a model from that picture. Shared by the humanoid and prop runners.
 */

export function imageTo3dFlags(params: Record<string, unknown>, imagePath: string): string[] {
  const flag = (name: string, key: string): string[] =>
    params[key] === undefined ? [] : [`--${name}`, String(params[key])];
  const formats = Array.isArray(params['target_formats'])
    ? (params['target_formats'] as string[]).join(',')
    : 'glb';
  const data: Record<string, unknown> = {};
  for (const key of ['auto_size', 'origin_at'])
    if (params[key] !== undefined) data[key] = params[key];
  return [
    '--image-url',
    imagePath,
    ...flag('model-type', 'model_type'),
    ...flag('ai-model', 'ai_model'),
    ...flag('target-polycount', 'target_polycount'),
    ...flag('pose-mode', 'pose_mode'),
    ...flag('should-texture', 'should_texture'),
    ...flag('texture-resolution', 'texture_resolution'),
    ...flag('enable-pbr', 'enable_pbr'),
    '--target-formats',
    formats,
    ...(Object.keys(data).length ? ['--data', JSON.stringify(data)] : []),
  ];
}

export function textToImageFlags(params: Record<string, unknown>): string[] {
  const flag = (name: string, key: string): string[] =>
    params[key] === undefined ? [] : [`--${name}`, String(params[key])];
  return [
    '--prompt',
    String(params['prompt']),
    ...flag('ai-model', 'ai_model'),
    ...flag('pose-mode', 'pose_mode'),
    ...flag('aspect-ratio', 'aspect_ratio'),
    ...flag('remove-background', 'remove_background'),
  ];
}
