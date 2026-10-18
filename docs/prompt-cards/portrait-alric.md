# Prompt card: portrait, Alric (first party appearance)

**Asset id:** `portrait-alric`
**Used by:** the portrait tool (to be built) → the band's oval (26×38 UI pixels), the sheet's
(52×76), and the 3D head for the paper doll (DESIGN 12)
**Output spec:** 2:3 portrait (1024×1536), PNG, no text. Seventeen images in one ChatGPT chat:
the neutral portrait, a flat-lit reference for the 3D head, and fifteen expressions edited from
the neutral one.
**Returned to:** this chat; Claude files them as `pipeline/inbox/portraits/alric/<name>.png`.

## 1. The neutral portrait (`neutral`)

Regenerate this one until the face is right: every other image is an edit of it.

> A photographic head-and-shoulders portrait of a costumed actor, like a video-captured
> character portrait from a classic 1990s first-person party role-playing game. Real skin with
> pores and small imperfections, no retouching, no glamour or beauty lighting, no smooth or
> plastic skin, slightly soft focus, natural muted colours. One soft warm tungsten key light from
> the upper left, a dim warm fill from the right, no rim light. A plain, flat, very dark
> warm-brown background with nothing in it. Portrait format 2:3; the person faces the camera
> squarely and looks straight into the lens; head and shoulders centred, the top of the hair a
> little below the top edge, the eyes at two fifths of the height, the shoulders reaching the
> bottom edge and filling most of the width. Clothing: only a plain, undyed, slightly worn linen
> shirt with a simple open collar; no armour, mail, hood, hat, jewellery or cloak. No text,
> border, frame, vignette, lens flare or bokeh.
>
> The person: a human man of about 38, a seasoned soldier. Weathered, lightly tanned skin, a
> faint old scar through the left eyebrow, a slightly crooked nose; short, thick dark-brown
> hair; a short, neatly trimmed dark beard; grey-blue eyes. A calm, steady, neutral expression,
> mouth closed.

## 2. The reference for the 3D head (`flat`)

> Edit the portrait above for a 3D modeller's reference. Keep the same man, face, hair, beard,
> shirt, framing, pose and image size exactly. Change only the light and the background: flat,
> even, shadowless light from the front with no dark side to the face, and a plain medium-grey
> background.

## 3. The expressions (one edit each, all from the neutral portrait)

Paste this, with `[EXPRESSION]` replaced by one line below, once per line:

> Edit the neutral portrait. Keep everything exactly the same: the same man, face shape, skin,
> hair, beard, shirt, light, background, framing, camera distance and image size; his head stays
> in the same place and at the same size. Change only his facial expression: [EXPRESSION].

| Name           | [EXPRESSION]                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `eyes-half`    | his eyelids half closed, as in the middle of a blink                                                    |
| `eyes-closed`  | his eyes fully closed and his face relaxed, as if asleep                                                |
| `glance-left`  | his eyes look toward the left edge of the picture, his head turned very slightly the same way           |
| `glance-right` | his eyes look toward the right edge of the picture, his head turned very slightly the same way          |
| `wince-small`  | a sharp flinch of pain: eyes squeezed nearly shut, brows drawn together, teeth just showing             |
| `wince-big`    | a strong grimace of pain: eyes shut tight, brows knotted, mouth open over clenched teeth                |
| `smile`        | a warm, pleased smile with the mouth closed, the eyes slightly narrowed                                 |
| `cast`         | deep concentration: brows drawn down, eyes slightly narrowed and fixed ahead, lips pressed together     |
| `talk`         | speaking: the mouth half open in the middle of a word, otherwise calm                                   |
| `refuse`       | a firm refusal: the mouth set in a hard line, brows lowered, a slight frown                             |
| `afraid`       | fear: eyes wide open, brows raised and drawn together, the mouth slightly open                          |
| `weak`         | exhaustion: heavy drooping eyelids, a slack mouth, a drained, tired look                                |
| `sick`         | illness: pale, clammy skin with a faint grey cast, dark circles under sunken eyes, a weary, pained look |
| `drunk`        | drunkenness: flushed cheeks and nose, heavy-lidded unfocused eyes, a loose, lopsided grin               |
| `insane`       | madness: wild, staring wide eyes, one brow raised higher than the other, a crooked manic grin           |

Made by the game instead: asleep (`eyes-closed`), unconscious (`eyes-closed`, tipped and
darkened), poisoned and diseased (tints over `sick`), stoned, paralysed and cursed (tints over
`neutral`), dead and eradicated (a drawn gravestone and ash).

## Checklist before returning

- Every image is 2:3, the same size as the neutral one, with no text or frame.
- In the expressions, only the face changed: hair, beard, shirt, light and background as in the
  neutral portrait, the head in the same place. Regenerate any that moved; the tool will also
  flag them.
- Name each image as in the table, or send them in the table's order.
