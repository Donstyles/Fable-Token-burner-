# Prompt card: trees and bushes (batch 012)

**Asset ids:** the twenty of batch 012, numbered as on the tree sheet (2026-10-19).
**Used by:** Meshy image-to-3D (batch 012), then the game's tree sprites (DESIGN 16.14).
**Output spec:** square (1024×1024 or larger), PNG, one tree per picture, plain flat fuchsia
(#FF00FF) background (owner, 2026-10-19: "We do fuchsia backgrounds").
**Made by:** the owner, in one ChatGPT chat, free (owner, 2026-10-19). Never text-to-3D.
**Returned to:** this chat; Claude keys the fuchsia out and files each as
`pipeline/inbox/<id>.png` (`npm run asset -- inbox <id> <picture>`), and batch 012 then runs
only its image-to-3D steps (15 credits a tree) once the owner approves it.

## The setup message (send once, first)

> I need concept pictures for 3D game trees, one picture per message. Every picture follows
> these rules. A single tree or bush, as a low-poly 3D game asset from a late-1990s
> first-person fantasy RPG: simple solid readable shapes, hand-painted textures, muted natural
> colours. The foliage is a few large solid clumps that hide the branches: no see-through
> gaps, no single leaves, no thin twigs. Seen from the side at eye level, upright and centred,
> the whole of it in the frame from the foot of the trunk to the top, with a little margin.
> Flat even light, no shading from one side, no shadows. Plain flat pure fuchsia background
> (#FF00FF) everywhere around it: no ground, no grass, no shadow under it, nothing else in
> the picture, no text. Square image. Reply only with the picture.

## The pictures (one message each)

Received: 1 (2026-10-19), 2 to 11 (2026-10-21).

1. `tree-spruce-01`: A tall Norway spruce, narrow cone, dense dark green layered foliage from
   near the ground to a pointed top, straight brown trunk.
2. `tree-spruce-02`: A very tall, slim spruce, dark blue-green tiers of branches drooping
   slightly, the lowest metres of the trunk bare.
3. `tree-spruce-03`: A weather-beaten spruce, tall and gaunt, dark green tiers, a bent top,
   grey trunk.
4. `tree-fir-01`: A silver fir, broad cone of dense deep green foliage, flat top, thick grey
   trunk.
5. `tree-pine-01`: A Scots pine, tall bare orange-brown trunk with an irregular flat-topped
   crown of dark green needles high up.
6. `tree-pine-02`: A young pine, a compact cone of dense green needles on a short trunk.
7. `tree-larch-01`: A European larch, slender cone of soft light green foliage in tiers, thin
   trunk.
8. `tree-oak-01`: A great old oak, massive gnarled trunk, wide spreading rounded crown of
   dense dark green leaves.
9. `tree-oak-02`: A young oak, straight trunk, rounded dense green crown.
10. `tree-beech-01`: A European beech, smooth grey trunk, tall oval crown of dense bright green
    leaves.
11. `tree-birch-01`: A silver birch, slender white trunk with dark marks, an oval crown of pale
    green leaves.
12. `tree-maple-01`: A maple, broad rounded crown of dense green leaves, sturdy brown trunk.
13. `tree-linden-01`: A linden, tall dense heart-shaped crown of dark green leaves, straight
    trunk.
14. `tree-willow-01`: A weeping willow, thick trunk, a drooping dome of pale green foliage
    reaching low.
15. `tree-dead-01`: A dead leafless tree, twisted grey trunk and a few thick bare crooked
    limbs, each a clear solid shape (no foliage rule for this one).
16. `tree-dead-02`: A dead pine snag, tall broken grey trunk with a few short bare branch
    stubs (no foliage rule for this one).
17. `tree-palm-01`: A date palm, tall rough brown trunk curving slightly, a crown of long green
    fronds.
18. `tree-palm-02`: A short fan palm, stout trunk, a rounded crown of stiff green fan-shaped
    fronds.
19. `bush-01`: A dense round shrub of dark green leaves, waist high, growing straight from the
    ground.
20. `bush-02`: A wild hazel bush, a loose dome of green leaves over a few thin stems.

## Checks before sending them back

- One tree, whole, centred, nothing cut off at the top or the foot.
- Fuchsia background, flat, with no ground patch or shadow under it; no pink or purple in
  the tree itself (it would key out with the background).
- Foliage reads as a few solid masses, not a cloud of loose leaves.
