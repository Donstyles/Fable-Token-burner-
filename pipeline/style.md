# Style bible

Every image prompt handed to the owner (ChatGPT) or sent to Meshy starts with
the **style prefix** below, then the subject-specific part from the prompt
card. Keep the prefix verbatim so all art shares one look.

## Style prefix

> Late-1990s painted fantasy illustration in the spirit of a classic
> first-person party role-playing game. Rich, saturated oil-paint colours on
> warm earth tones: ochre, umber, moss green, slate blue, with gold and deep
> red accents. Strong, simple shapes and clear silhouettes; dramatic but
> readable lighting from a single warm key light; slightly grainy painterly
> texture; no modern digital gloss, no lens flare, no photorealism, no text,
> no watermark, no signature.

## 3D reference prefix

Concept images that feed Meshy (humanoids, props, buildings) are not
illustrations and not photographs. The first attempt used a reenactment
photograph (the bandit, batch 001): the layered, loose costume came back as
separated parts with gaps at the belt and collar, and the model's wide
stance became a bow-legged walk. Meshy's low-poly mode wants what its own
examples look like: a clean, stylised concept render with fitted clothing and
a simple silhouette. The game's filter supplies the 1998 look afterwards, so
this prefix is for Meshy's eyes only (owner, 2026-10-15):

> Clean full-body character concept for a low-polygon video game, rendered
> like a studio turnaround model: simple solid shapes, clothing fitted to the
> body, no cape, cloak, skirt or loose straps, nothing dangling or thin, no
> fur, no transparent cloth, muted natural colours, flat even lighting, no
> text, no watermark, no signature.

## Forbidden

- Text, letters, logos or watermarks in the image.
- Modern materials or technology.
- Anime or cartoon stylisation.
- Lens effects: flare, bokeh, chromatic aberration, vignette.

## Palette anchors

Marble (cool grey-white with warm veins), aged gold, dark oak, parchment,
wrought iron, moss, torchlight orange, night-sky slate.

## Spell icons

The spellbook's pictures (owner, 2026-10-17: "looks straight out of mm6"),
dialled in over critic passes against MM6's 99 icons (DESIGN.md 16.22). A
spell icon is one text-to-image picture, never 3D. The look is
`ICON_STYLE` in `tools/lib/batch.ts`, appended verbatim after the subject;
`npm run asset -- batch icons <name> <specs.json> --grant spell-icons`
plans the batch, `run <nnn> --dry-run` then `run <nnn>` makes it, and
`icon accept <nnn> <id>` puts the finished bitmap into
`assets/icons/spells/`.

- **Model**: `nano-banana-2-lite` (3 credits). The larger model drew
  better anatomy once but darker, with photographic fire; it is not the
  bottleneck.
- **Ground**: a plain parchment background, no floor or shadow, and no
  Meshy background removal (`removeBackground` off). Removal strips halos
  and translucent magic and leaves dark haze; our matte keys the picture
  by its distance from the border's colour and keeps the glow.
- **Shape**: 4:3; 16:9 for a bolt or a beam across the page.
- **Subjects**: say what is in the picture and where, as MM6's icon shows
  it: slim adults (about seven heads tall) in a coif and hauberk of pale
  silver-grey mail under an off-white linen tabard, tan and brown
  leather; the subject washed in its magic's colour; the magic as light
  with a white-hot core, coloured edges, deeper tips and a soft halo. Say
  "no person" for an effect-only icon, or the model adds a caster.
- **Light**: people and things mostly mid-tones, a little darker than
  their ground (icon critic, pass 2: high-key overshot to luma 180 against
  MM6's 148); magic on its own, with no person or thing, pale: a little
  lighter than the ground, its darkest parts no darker than a mid-tone,
  its colour in pale tints (pass 3: MM6's twenty pure effects average
  181, three over their parchment; ours came 126 to 172). All on a
  mid-tone parchment ground (about #B8AC96), the subject wider than tall
  wherever its shape allows. The post-process maps the
  picture's tones so its ground lands on the parchment's 173 (black, 60 and
  white kept); a pure light effect (a bolt, sparks, a fire spiral) keeps
  its own exposure (`expose: 'keep'`). It still lifts, never darkens, a
  subject darker than MM6's (5th percentile under 45, more than 5% under
  luma 50, or a mean under 105).
- **Only what is named**: the style text says no extra people, casters,
  hands or wands; a subject sentence for an effect says "and nothing else".
- **Bitmap** (`tools/lib/icon.ts`): the subject fitted 68 by 50 (wider,
  up to 100, for a bolt), its box blind to specks (a pixel counts with
  twenty covered in its nine-by-nine window), the whole box taken from the picture round it
  so a glow runs to the oval's edge, on MM6's 68 by 52 parchment oval
  (184,172,150) with a four-level mottle in a 72 by 54 box, keyed outside
  the oval, 255 colours; then the parchment keyed out, so in the game the
  icon sits on the page's own shadow (paint.ts `ellipse`, multiplied), as
  an empty place does. `icon reprocess <nnn>` runs a better recipe again on
  pictures already paid for.
