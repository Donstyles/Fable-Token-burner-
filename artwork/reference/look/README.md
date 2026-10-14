# Look reference (3D rendering target)

Five images supplied by the owner on 2026-10-14 as the look to emulate
**precisely** for the 3D world. Reference only, not shipped. They replace the
1998 software-rendered look as the rendering target; MM6 remains the reference
for structure, interface and tone (see `../README.md`).

| File | What it shows |
| --- | --- |
| `look-01-town-arch-dusk.jpg` | Through a stone arch: half-timbered houses, warm lit windows, a hanging lantern, a cathedral on a hill lost in violet mist, cobbles catching lantern light. |
| `look-02-mountain-path-castle.jpg` | Knight and horse on a muddy forest path, fog banks between pines, a castle on a crag, overcast sky, snowy peaks. |
| `look-03-cliff-horse-castle.jpg` | First-person hand on a stone parapet, pixelated close-up texels, low-poly horse, sea of cloud, castle on rock, sun behind cloud. |
| `look-04-tavern-evening.jpg` | Half-timbered tavern at dusk, glowing windows with figures inside, horse at a trough, castle silhouette on the hill. |
| `look-05-village-street-rain.jpg` | Wet cobbled street after rain, reflections of warm lamps, villager and cart horse, tavern sign, castle above the roofs. |

## What defines the look

- **Geometry**: low-poly but complete. Houses, carts, horses and people read
  as early-2000s game models: a few hundred to a few thousand triangles, hard
  silhouettes, no smoothing tricks.
- **Textures**: low resolution with visible texels up close (the parapet and
  glove in image 3, cobbles in 1 and 5), sampled nearest or near-nearest, with
  mipmaps so distance stays calm. Painterly or photo-sourced, 128–512 px.
- **Lighting**: warm point lights (lanterns, windows) pooling on nearby
  surfaces, cool blue-violet ambient at dusk, a weak low key light. No
  real-time shadows to speak of; lighting is mostly vertex and baked.
- **Glow**: emissive windows and lanterns bloom softly.
- **Atmosphere**: heavy distance fog tinted like the sky (violet-grey or
  cold grey), fog banks lying between trees and in valleys, overcast or
  dusk skies with a soft gradient and cloud texture.
- **Grade**: cool shadows and warm highlights (split toning), slightly lifted
  blacks, gentle vignette, no dithering, no posterisation, soft overall.
- **Wet surfaces**: cobbles after rain reflect the lamps (image 5).
- **Resolution**: moderate, slightly soft; not pixelated as a whole frame.
