# MM6's interface and the feel of play, against the code

What Might and Magic VI puts between the player and the world (movement, the controls, the
HUD's live parts, every screen, the dialogs, sound, music, day and night) and what this project
does instead, with numbers wherever a source gives them. Written 2026-10-18 against commit
`573790f`. It deepens sections 28, 30 to 33 and 35 of `docs/MM6-GAPS.md` (cited as GAPS) and
changes no decision in `docs/DESIGN.md`; where it proposes one, section 14 lists it for the
owner.

Not repeated here, only pointed to: creation, statistics, skills, the combat model, conditions,
rest rules, hazards (`docs/gaps/characters.md`, cited as CHR); spells, the quick spell's rules,
buffs (`docs/gaps/magic.md`, MAG); items, shops' prices, Identify and Repair rules (`docs/gaps/
items.md`, ITM); the monster record, its sounds and AI (`docs/gaps/monsters.md`, MON); places,
houses, coaches and hours by town (`docs/gaps/world.md`, WLD).

## Contents

1. How to read this
2. Findings
3. The frame: what the screen holds
4. Movement
5. The controls and their touch translation
6. Acting on the world
7. The fight as an interface
8. The HUD's live parts
9. Screens
10. Houses, people and passages
11. Shell: menu, saves, options, the start and the end
12. Sound and music
13. Day, night, weather and the view
14. Decisions for the owner
15. Ranked: the twenty gaps a player of the original notices most
16. What the owner should check in the original
17. Sources

## 1. How to read this

- **Code read**: `src/app/input/*`, `src/app/audio.ts`, `autosave.ts`, `settings.ts`, `boot.ts`,
  `main.ts`; `src/world/player.ts`, `wading.ts`, `soundscape.ts`, `ambience.ts`, `daylight.ts`,
  `atmosphere.ts`, `spell-target.ts`, `combat-feedback.ts`, `monster.ts`, `npc.ts`, `portals.ts`;
  `src/ui/*` (the screens, the HUD, the status line, the talk panel); the glue in
  `src/dev/index.ts`; `src/game/automap.ts`, `time.ts`, `rest.ts`, `state.ts`, `party.ts`,
  `content.ts`. `npx vitest run src/app/input src/world src/ui` passes (16 files, 94 tests).
  Line numbers are those of commit `573790f`; other sessions were editing `src/ui/paint.ts`,
  `ui.css` and `dialogue.ts` while this was written.
- The owner's MM6 screenshots (`artwork/reference/`, third-party) were cropped and measured by a
  throwaway script outside the repository. **Screenshots 17 to 35 show GrayFace's patch at work**:
  the spellbook's foot carries a third tab (a sword and a spark, the patch's "attack spell",
  [GF-P] 2.5) that the unpatched video capture of 2026-07-09 lacks. Anything measured from them
  may be patched behaviour.
- **Confidence** of each MM6 fact:
  - **verified**: MM6's own data, text tables, manual, reference card or screens show it, or two
    independent sources agree;
  - **reported**: one source says it;
  - **inferred**: derived here, or read from the MM7 engine as OpenEnroth rebuilds it [OE]. That
    engine grew out of MM6's; an [OE] number is a strong hint, never proof.
- **Status** words as in GAPS: Missing, Partial, Present but deviates, Present.
- **Size**: hours of code and tests for one person, no art, unless "+ art" or "+ audio" says so.
- **Notice** (as in CHR): **N1** in the first minutes, **N2** in the first town, **N3** by mid-game,
  **N4** late, rarely, or only an expert.
- **Touch**: **port** means the MM6 behaviour carries over to a phone as it is; **redesign** means
  a touch screen forces a different control, and section 14 asks the owner.
- **Units**: MM6 distances in game units of about 1 cm (inferred, as MON and CHR: the MM7
  engine's party is 192 units tall with its eyes at 160 [OE]). Angles in MM6's own 2048 to the
  circle [MMX] are converted to degrees.
- Source tags are in square brackets; section 17 lists them. [GLB n] is entry n of MM6's
  `GLOBAL.TXT`. Short interface labels are named; MM6's message lines are paraphrased.

## 2. Findings

1. **The view is a panorama MM6 never had.** The camera renders the whole 932 × 430 canvas at a
   vertical field of 66° (`src/app/boot.ts` line 55) and the band covers its foot, so the visible
   view spans about 106° across and sits with the horizon 65 % of the way down. The MM7 engine
   shows 75° across outdoors and 60° indoors over a 460 × 344 view with the horizon in the middle
   [OE `Camera.h`, `GameConfig.h`]; MM6's view is that same 460 × 344 box (measured on
   screenshot-17). On the shell's own pixel grid everything looks 26 % smaller than MM6 outdoors
   and 44 % smaller indoors. Inferred; 2 h; N1.
2. **There is no right panel.** MM6 gives a quarter of its screen to the minimap and compass, two
   hireling windows, the strip of active party spells, four books (Quests, Notes, Map, Calendar),
   the food and gold counters and four gold buttons (Cast Spell, Rest, Quick Reference, Game
   Options) [SHOT-17; CARD; MAN]. The project has a shelf of five spines and a rest coin in the
   band, no minimap, no compass, no counters, no menu button. The phone's shape forces a new
   layout (section 3). Verified; N1.
3. **The shelf's pictures name the wrong books.** The project painted MM6's sword, quill, globe and
   key on its spines (`EMBLEM_ART`, `src/ui/paint.ts` lines 526–603) but put MM6's Quests sword on
   the character sheet, its Notes quill on the spellbook and its Calendar key on the quest log;
   only the globe is still the Map. A veteran reaches for the sword to read quests. Verified (the
   books' order [MAN; CARD], each emblem by that order); 0.5 h; N1.
4. **One speed.** MM6 walks, runs with Shift at twice the pace, walks backward at full walking pace
   and sidesteps at three quarters (MM7 engine numbers [OE]; the keys [MAN] verified). The project
   walks at 4.5 m/s, backs off at a third and strafes at two thirds, with no run
   (`src/world/player.ts` line 49, `src/app/input/zones.ts` lines 30–31). Run is N1.
5. **MM6 looks up and down only 22.5° each way** without the patch's mouse look [MMX `LookAngle`],
   and has a key to centre the view. The project allows 60° (`player.ts` lines 53–54), only while
   standing, with no centre control. Verified; 2 h; N2.
6. **MM6 has a jump key** (X) as well as the Jump spell [MAN, keys], against DESIGN 7's "a spell,
   not a button". Verified; N2.
7. **The right mouse button is half of MM6's interface.** Held over anything it shows a pop-up:
   items, spells, skills, statistics, monsters (with their hit points), portraits, buffs; the
   pointer over anything names it in the status line [MAN; CARD; SHOT-20, 23, 25]. The project has
   neither: a tap acts, and only props without an action get a name. A press-and-hold is the
   natural touch twin of a held right button and is unused today. Verified; 18 h; N1.
8. **The gem beside each face is an enemy detector and a recovery light, not a condition light**
   [MAN, combat]. The MM7 engine lights it yellow when a hostile is within 5,120 units (about 51 m)
   and red within 307 (about 3 m) [OE `Actor.cpp`]. The project colours it by condition
   (`gemClass`, `src/ui/hud.ts` lines 32–38) and dims the sigil while a member recovers (`hud.css`
   line 118). CHR 10.5 sizes the fix; N1.
9. **No music.** MM6's map table gives every map a CD track: one theme for the six eastern regions,
   one for nearly every dungeon, one for the temples and castles, its own for Goblinwatch, the
   Arena, the Mire, Sweet Water and the Hive [MST]. The project plays none. Verified; 5 h + audio;
   N1.
10. **The shell's screens are web forms where MM6's are places.** MM6 enters a house into its
    proprietor's room (a looping film, the keeper's portrait and name, a short menu), keeps
    opening hours, lays a shop's goods on shelves and turns the party round on the way out
    [SHOT-27 to 29; 2DE; GF-P]; the rest screen has three waits, an hourglass and a clock that
    visibly runs [SHOT-30; CARD]; the spellbook selects on the first click and casts on the
    second, with a tab to set the quick spell [CARD]. The project has stone panels of rows and
    buttons; its book casts on the first tap. Verified; N1–N2.
11. **Passages are silent triggers.** MM6 asks before leaving a region ("leave X? it takes N days to
    Y") and shows a dungeon's entrance picture with an Enter choice, some locked behind a key
    [GLB; 2DE]. The project walks the party into a disc and reloads (`src/world/portals.ts`
    lines 31–48). Verified; 5 h + art; N2.
12. **Sound is a sketch.** Footsteps are discrete synthetic taps every 0.78 m on six surfaces; the
    fight has three impacts; every spell shares one sweep; there are no voices, monster sounds,
    doors, chests, coins, chimes or jingles (section 12). MM6 has per-spell sounds, per-map door
    sounds, monster attack, death, pain and fidget sounds, character voices and a walking sound it
    lets the player switch off [MMX; CARD]. N1.
13. **What already matches**: instant start and stop; a tap on a thing acts on it, as a click does;
    a portrait tap selects and a second tap opens the sheet [CARD]; an open screen or a talk
    pauses the world; the member selection advances after a blow; the 14 × 9 pack filled row by
    row, as the unpatched game most likely does (inferred from [GF-P]); the calendar, month and
    weekday names; a 9:00 start on 1 January 1165 [SHOT-30]; 200 gold and 7 food at New
    Sorpigal's gate [SHOT-17], apparently the start.

## 3. The frame: what the screen holds

MM6 at 640 × 480 (verified from SHOT-17 to 32 and the card's screen diagram [CARD]):

| Region        | MM6                                                                                                                                                                       | Project                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| View          | 460 × 344 at (8, 8), marble pillars either side, a lintel with capitals                                                                                                   | full canvas width 932 CSS px, 330 tall above the band; pillars and lintel painted (`src/ui/hud.ts` lines 56–68)                   |
| Band          | under the view, 128 px tall: a status strip across its top, four oval portraits each with a gem at the upper right and a green and a blue tube to its right               | 100.5 CSS px (`hud.css` line 12): clock plaque at the left, four cells, the shelf at the right; status line floats above the band |
| Right panel   | 172 px wide: compass strip over an arched minimap with − and + buttons; two hireling windows; the active party spells strip; four books; food and gold; four gold buttons | none                                                                                                                              |
| Over the view | Guardian Angel and Fly icons, the Water Walk icon, the turn-mode indicator [CARD; MAN]                                                                                    | the underwater tint, the red wash when struck                                                                                     |
| Screens       | books and character pages cover the view only; band and right panel stay (the character pages put the paper doll in the right panel)                                      | screens cover the view only and keep the band (`src/ui/ui.css` lines 161–169)                                                     |

The phone is 19.5 : 9. MM6's 4 : 3 frame with its 172-pixel panel would leave a 2 : 1 view.
Two ways out, both a redesign the owner picks (section 14):

- **A right panel** (MM6's layout): the view shrinks to about 70 % of the width; the furniture
  sits where a veteran's eyes look for it; the look zone shrinks with the view.
- **Furniture in the band and over the view**: the minimap as an arched inset at the view's top
  right with the compass strip on it, food and gold beside the clock, the four gold buttons and
  four books in the shelf, hireling windows beside the portraits. Keeps the panorama.

Either way the pieces are the same; this document sizes them one by one. **Size** of the layout
itself: 8 h. **Touch: redesign. N1.**

## 4. Movement

### 4.1 Walking, running, backing and sidestepping

|                  | MM6                                                                                                                    | Confidence              | Project                                                                                       | Status                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| Keys             | arrows walk and turn; Shift with an arrow runs; Ctrl with ← or → sidesteps [MAN, keys; CARD]                           | verified                | dev keys W/S/↑/↓, A/D/←/→, Q/E (`src/app/input/dom.ts` lines 40–46); touch stick (`zones.ts`) | port, redesign for run |
| Walk             | 384 units a second, about 3.8 m/s [OE `party_walk_speed`]                                                              | inferred                | 4.5 m/s (`player.ts` line 49)                                                                 | deviates               |
| Run              | twice the walk forward only, about 7.7 m/s; none up slopes too steep [OE `Outdoor.cpp`]                                | inferred (key verified) | none                                                                                          | Missing                |
| Always run       | not in the original (the patch adds it and enables it by default, Shift then walks) [GF-P]                             | verified                | —                                                                                             | —                      |
| Back             | the walk speed, never running [OE: backward multiplier 1.0, `mm7_data.cpp`; running backward walks]                    | inferred                | one third of forward (`zones.ts` line 30), the owner's choice of 2026-10-11                   | deviates (owner)       |
| Sidestep         | three quarters of the walk outdoors, half indoors [OE `Outdoor.cpp`, `Indoor.cpp`]                                     | inferred                | two thirds (`zones.ts` line 31)                                                               | close                  |
| Diagonal         | keys combine: forward with a sidestep adds both [OE: each queued action adds its velocity]                             | inferred                | one axis per gesture (`zones.ts` lines 147–165), owner's choice                               | deviates (owner)       |
| Start, stop      | instant                                                                                                                | inferred                | instant (`accelGain` 1, `player.ts` line 62)                                                  | Present                |
| While recovering | moving slows a member's recovery, running more [MAN, combat]; the MM7 engine counts it at half rate while running [OE] | reported                | nothing (no running)                                                                          | Missing (CHR 9.2)      |

One player reports the unpatched game walking forward slower than backward once always-run
was switched off [GOG1]; that fits a backward pace equal to the walk, not a third of it.

**Fix.** Two fixed speeds on the stick: walk from the dead zone to a run radius, run beyond it
(MM6 has no analog pace; a half-pushed stick should not creep). Suggested: walk 12–90 px of
travel, run beyond 90 px, the footstep loop switching with it (12.1). MM6's ratios as tuning
values (run 2.0, strafe 0.75 outdoors and 0.5 indoors, back 1.0) behind the owner's current
choices until the owner decides (section 14). 3 h with tests. **N1. Touch: redesign.**

### 4.2 Turning and looking

|                  | MM6                                                                                                                                                                      | Confidence                      | Project                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Turn rate        | smooth by default in the MM7 engine at 90° a second, 180° while running [OE `Party.cpp` line 68, `Outdoor.cpp`]; Controls offers 16 facings, 32 facings or smooth [CARD] | rate inferred; options verified | right-thumb drag 0.23°/px while walking (`player.ts` line 50); dev keys 120°/s (line 52)                |
| Look up and down | Page Down looks up, Delete down, End centres [MAN, keys]; the pitch stops at ±128 of 2048, ±22.5° [MMX `Party.LookAngle`]                                                | verified                        | right-thumb drag 0.33°/px (line 51), only while standing (`zones.ts` lines 166–172), ±60° (lines 53–54) |
| Centre view      | End, at once                                                                                                                                                             | verified                        | none; a "magnetic level" snap exists, off by default (line 63)                                          |
| Mouse look       | none in the original; the patch adds it, with −240 to 300 units (−42° to +53°) [GF-P; MMX]                                                                               | verified                        | the touch look drag behaves like the patch's mouse look                                                 |
| Voice            | the selected member may remark on looking up or down [OE plays such a reaction]                                                                                          | inferred                        | none                                                                                                    |

The touch scheme (DESIGN 7.1) is a sound phone adaptation and closer to the patch than to the
original. What a veteran misses: looking up or down while walking (keys work at any time in MM6),
a centre-view control, and the limit, which keeps MM6's view nearly level and makes its sprites
and walls read as they were drawn.

**Fix.** Clamp the pitch to ±22.5° by default with the patch's range as an option (0.5 h). Let a
vertical-dominant right-thumb drag pitch while walking (1 h). A two-finger tap on the right half
centres the view, as End (0.5 h). 2 h. **N2. Touch: redesign (gestures).**

### 4.3 Jumping

- MM6: X jumps [MAN, keys]; the patch notes lowered the jump a little after fixing movement
  rounding, so the original's jump is a key, not only a spell [GF-P]. Verified. The MM7 engine
  throws the party up at 480 units a second against a gravity of about 1,280 units a second
  squared: a hop of about 90 units (0.9 m) lasting 0.75 s; no jump from water without Water Walk,
  from steep ground or while burning [OE `Outdoor.cpp`]. Inferred.
- The Jump spell is a different thing: a leap of about 60 feet with no falling damage [DOB]; a
  member cannot cast it in the air [GLB 493]. MAG 4.2.
- Project: none. DESIGN 7: "Jump is a spell, not a button" (owner, 2026-10-11); the spell "takes no
  hold yet" (`src/dev/index.ts` lines 818–824).
- Gravity: the project's 39 m/s² (`player.ts` line 55, the owner's tuning of 2026-10-15) is three
  times the MM7 engine's; a drop off a ledge is over in a third of MM6's time. Inferred; the
  owner's feel call.

**Fix.** A hop with MM6's numbers on an upward flick of the left thumb, or a jump control on the
band (owner, section 14); the spell's leap on top. 3 h. **N2. Touch: redesign.**

### 4.4 Flying

- MM6: Fly works outdoors only [GLB 494; DOB]. Page Up rises, Insert sinks, Home lands [MAN,
  keys]. The ceiling is 3,000 units, about 30 m [MMX `Game.FlyCeiling`: 3000 in MM6, 4000 in MM7].
  Verified. The MM7 engine climbs and sinks at four times the walk and flies forward at four times
  the walk when running; it bobs gently while hovering [OE `Outdoor.cpp`]. Inferred. Fly drains a
  spell point every five minutes in the air [DOB]. Reported.
- The patch adds flying toward where the view points and flying with the mouse wheel [GF-P].
- Project: only the dev build's free camera (`src/dev/index.ts` lines 668–700).

**Fix.** With Fly up: the stick's forward follows the view's pitch (the patch's mouse-look flight,
natural on a phone), a Land control, the 30 m ceiling, the drain through MAG 5.5's buff store,
hover bob. 6 h after the buff store. **N3. Touch: redesign.**

### 4.5 Falling

- MM6: falls hurt; Feather Fall and the Jump spell prevent it [MAN; RPGC]. The MM7 engine hurts each
  member without feather fall for drop × maximum HP ÷ 2,560 when the drop exceeds 512 units (5 m):
  a fifth of everyone's hit points at 5 m, two fifths at 10 m, and a falling cry indoors [OE].
  Inferred; CHR 13 has the rule.
- Project: drops of 3 m or more print a line and hurt no one (`player.ts` line 61;
  `src/dev/index.ts` lines 935–936).
- Fix: CHR 13 (2 h). Add the members' cry when voices exist (12.4). **N2. Touch: port.**

### 4.6 Water

- MM6: no swimming and no wading. Deep water drowns a party without Water Walk [DOB; CHR 13]; the
  MM7 engine takes a tenth of each member's maximum HP a second and plays a splash on entry [OE].
  Water Walk works outdoors only and drains a point every 20 minutes in contact with water [DOB;
  the original drained every 5, GF-P]. Its icon shows over the view while it lasts [CARD].
- Project: wading slows to half from 0.25 m and to 0.35 from 1.3 m, which also prints "Deep water"
  (`src/world/wading.ts` lines 9–30; `src/dev/index.ts` lines 848–855); eyes under the surface tint
  the view (`wading.ts` lines 42–63).
- Gap: the slowdown is ours, the damage is missing (GAPS 37 decision 3).
- Fix: CHR 13 (3 h) and MAG for Water Walk; drop the wading slowdown if the owner follows MM6. **N2.
  Touch: port.**

### 4.7 The party's body

|            | MM6 (MM7 engine)                                                                               | Project                                          |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Radius     | 37 units [OE]                                                                                  | 0.35 m (`player.ts` line 56)                     |
| Height     | 192 units [OE]                                                                                 | 1.8 m (line 57)                                  |
| Eyes       | 160 units [OE]                                                                                 | 1.65 m (line 58)                                 |
| Step       | unverified                                                                                     | 0.4 m (line 59)                                  |
| Slopes     | steep terrain slides the party down and forbids running and jumping [OE `isSlopeTooHighByPos`] | 50° walkable, sliding beyond (lines 60, 255–260) |
| Map bounds | outdoors the party cannot go past ±22,528 units on either axis [OE `maxPartyAxisDistance`]     | level bounds                                     |

All inferred from the MM7 engine; the project's numbers are within a few centimetres. **Present.**

## 5. The controls and their touch translation

### 5.1 MM6's keys

From the manual's key chart and the reference card [MAN, keys; CARD]; all verified.

| Key                    | MM6                                                                                                     | Project today                                                       | Touch proposal                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Arrows                 | walk, back, turn                                                                                        | stick and right-thumb drag                                          | keep                                                          |
| Shift + arrow          | run                                                                                                     | —                                                                   | stick beyond the run radius (4.1)                             |
| Ctrl + ← →             | sidestep                                                                                                | stick sideways                                                      | keep                                                          |
| Page Down, Delete, End | look up, look down, centre                                                                              | drag while standing                                                 | drag at any time; two-finger tap centres (4.2)                |
| Page Up, Insert, Home  | fly up, fly down, land                                                                                  | —                                                                   | flight along the view, a Land control (4.4)                   |
| X                      | jump                                                                                                    | —                                                                   | flick or button (4.3)                                         |
| A                      | the selected member attacks the nearest foe: a blow if near, a shot if far with a bow, otherwise a pass | tap a monster                                                       | an attack oval, or a tap on open ground with a foe near (7.1) |
| S                      | cast the quick spell: at the nearest foe, or the pointer turns to a crosshair for a subject             | —                                                                   | the Cast oval (7.2)                                           |
| C                      | open the spellbook                                                                                      | the Spells spine                                                    | the Cast oval held, or a book                                 |
| Space                  | use the nearest thing in view; search a body                                                            | tap the thing                                                       | tap; a Use control for things underfoot                       |
| Enter                  | real time and turns                                                                                     | —                                                                   | a mode control (7.3)                                          |
| Tab; 1–4               | next member; pick a member, again for their screen                                                      | tap a portrait, again for the sheet (`src/ui/hud.ts` lines 122–129) | keep                                                          |
| 5, 6                   | a hireling: pick, again to talk                                                                         | —                                                                   | tap a hireling window (8.9)                                   |
| Esc                    | the game menu; leave a screen                                                                           | a close glyph per screen                                            | a Game Options oval                                           |
| Q, N, M, T             | quests, notes, map, calendar                                                                            | Quests and Map spines                                               | MM6's four books (8.8)                                        |
| Z                      | quick reference                                                                                         | —                                                                   | a gold oval (9.6)                                             |
| R                      | rest                                                                                                    | the rest coin                                                       | keep                                                          |
| + −                    | zoom the automap                                                                                        | —                                                                   | the minimap's own − + (8.5)                                   |
| F4                     | full screen or window                                                                                   | —                                                                   | not needed                                                    |

### 5.2 MM6's mouse

[MAN, mouse and inventory; CARD, mouse and shortcuts]; verified.

- **Pointing names things.** Over a door, a person, a fountain, a tree, the status line names it;
  signs show their text there [MAN; LP; SHOT-32 "tree"]. Over a HUD piece it names that piece
  (the gold line also gives the bank balance, the food line the rations [GLB]).
- **Left click acts**: pick an object up, open a door, enter a house, talk, attack the monster
  clicked with the selected member.
- **Right click held informs**: a pop-up for whatever is under the pointer (6.4).
- **Ctrl + click casts the quick spell at the target clicked.**
- **An item in hand** (picked up from the pack or the ground) follows the pointer: click the view
  to drop or throw it, a face to give it, the paper doll to equip or use it; right-click a face to
  make that member use it; right-click a potion with a potion to mix, an empty bottle with a herb
  to brew; a number key gives it to that member [CARD].
- Unpatched, Ctrl + click on a portrait swapped two members' places; the patch removed it as
  buggy and keeps a hidden option to bring it back [GF-P]. Verified.

### 5.3 What the project's touch does today

- Left half: an invisible stick, one axis per gesture, dead zone 12 px, full speed at 70 px
  (`zones.ts` lines 27–34, 143–165). Right half: look while standing, turn while walking (lines
  166–172). A touch of at most 250 ms and 12 px is a tap (lines 32–33, 194–197). Tested.
- A tap picks the mesh under it (`src/dev/index.ts` lines 616–664): a villager talks; a monster is
  attacked by the ready member (3.5 m reach unless a bow is slung, lines 595–610); a house within
  9 m opens its service (`DOOR_REACH`, `src/game/content.ts` line 54), farther off the line asks the
  party to come to the door; any other prop is named; ground and walls stay quiet. The tapped mesh
  glows for 250 ms (lines 622–632; MM6 shows no such glow).
- A long press does nothing: it is not a tap, and press-and-hold callouts are switched off
  (`src/main.ts` lines 22–34).
- No gesture runs, jumps, centres, flies, attacks the nearest, casts a quick spell, examines or
  holds an item.

### 5.4 A touch scheme that carries MM6 across

A proposal for the owner; every row keeps DESIGN 7.1's base (stick left, look right, tap acts).

| MM6                | Touch                                                                                                                                                                                   | Conflicts and answers                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| hover names        | a tap on a thing with no action names it (today); a hold names and explains anything (next row)                                                                                         | —                                                                                                                                  |
| right button held  | **press and hold (400 ms, no travel) shows the pop-up; lifting closes it**                                                                                                              | on the left half a hold that then moves becomes the stick and drops the pop-up; on the right half a hold that moves becomes a look |
| left click         | tap (today)                                                                                                                                                                             | —                                                                                                                                  |
| A                  | a gold attack oval on the band, or a tap on open ground while a foe is within 51 m                                                                                                      | the open-ground tap must never hit villagers; owner pick                                                                           |
| S, Ctrl + click    | tap the Cast oval: an attack spell goes at the nearest foe in the bolt cone, a member spell waits for a portrait tap (as the book does now), and while armed a tap on a monster aims it | holding the oval opens the book (C)                                                                                                |
| Shift              | stick beyond the run radius                                                                                                                                                             | —                                                                                                                                  |
| X                  | an upward flick of the left thumb ending within 150 ms, or a jump oval                                                                                                                  | flick versus walking forward: require the flick to start and end inside 150 ms                                                     |
| End                | two-finger tap on the right half                                                                                                                                                        | —                                                                                                                                  |
| Enter              | an hourglass control in the band                                                                                                                                                        | —                                                                                                                                  |
| item in hand       | an item lifted from the pack stays in hand (its icon by the status line); tap a portrait to give, the view to drop, the doll to equip or use, a cell to place                           | needs 9.2's doll and a visible held item                                                                                           |
| Esc, Z, Q, N, M, T | ovals and books, as MM6's                                                                                                                                                               | room: section 3                                                                                                                    |

**Size**: the gestures and their arbitration 6 h with unit tests in `zones.test.ts`; each control
is sized where its feature is. **N1. Touch: redesign.**

## 6. Acting on the world

### 6.1 The status line

MM6:

- A recessed stone strip across the top of the band, always there, empty when there is nothing to
  say [SHOT-17 to 32]. Its text is pale, centred and italic ("tree" over a tree, "Select Torch
  Light" in the book, a skill's price on the skills page) [SHOT-23, 25, 32]. Verified.
- It holds two things: what the pointer is over, and a timed message that fades after a while
  [MMX `Game.StatusMessage`, `MouseOverStatusMessage`, `StatusDisappearTime`]. Verified; the hold
  time is unverified. The Let's Play notes it is the game's only feedback line and easy to miss in
  a fight [LP update 1].
- Its messages, from MM6's interface strings [GLB], paraphrased: a member hits a foe for N
  damage; shoots it for N; inflicts N, killing it; gold found (and the share hirelings take); an
  item found; gold and an item found; packs full; not enough gold; the party cannot rest in
  turns, here, near foes, already resting, or without food; an ambush in camp ("Encounter!"); a
  member may train to level N; a member reaches level N with K skill points; training took N
  days; a spell that cannot be cast indoors, outdoors or in the air; no valid target; the spell
  failed; not enough spell points; a member in no condition to act; a place open only from h to h;
  nothing here. The Controls switch "show damage" hides the hit lines [CARD].

Project (`src/ui/status.ts` lines 15–33; `hud.css` lines 207–245): a bar above the band, from 60 px
in at the left to 300 px in at the right, that fades in with a line and out after 4 s by default;
yellow italic (`#f0d060`, line 240). Lines: hits and misses with the damage, a kill with its
experience (`src/dev/index.ts` lines 597–611, 906–918), "Nobody is ready", "cannot reach", names
of tapped props, "(come to the door)", "Deep water", "The party falls", cast lines (lines 702–827),
quest notices, villagers' words.

Gap: not always present; not full width; yellow, where MM6 is pale; no hover equivalent; most of
MM6's message set has nothing to report yet (no loot, no rest rules, no training screen).

Fix: the strip inside the band at full width, always drawn, pale text (1 h); a message queue with
MM6's hold, a press-held name (5.4) feeding the hover slot (1 h); MM6's message set wired as each
system lands, written in our own words (0.5 h each); the "show damage" option (0.5 h). 3 h now.
**N1. Touch: redesign (no hover).**

### 6.2 Reach

| What                                                         | MM6 (MM7 engine numbers)                                                          | Project                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pick up, open, pull a lever, enter a door, by click or Space | 512 units, about 5 m [OE `mouse_interaction_depth`, `keyboard_interaction_depth`] | doors 9 m (`content.ts` line 54); nothing else to reach                                                                 |
| Names on hover, monster pop-up                               | 12,800 units outdoors, 16,192 indoors (128 m, 162 m) [OE `mouse_info_depth_*`]    | any distance (`scene.pick`)                                                                                             |
| Melee                                                        | the foe within 407 units of its edge, about 4 m [OE `Character.cpp`]              | 3.5 m to the picked point (`src/dev/index.ts` line 595)                                                                 |
| Ranged, quick spell's auto-target                            | nearest foe within 5,120 units (51 m); 5,119 is the longest engagement [OE; GF-M] | bolts: nearest the view's centre within 40 m and 28° (`src/world/spell-target.ts` line 21); bows: any distance, at once |
| Mass spells                                                  | 4,096 units [OE]                                                                  | —                                                                                                                       |

Inferred except the engagement cap (verified). Fix: 5 m for doors and every future lever, chest
and item (0.5 h); bows and spells capped at 51 m with a projectile (CHR 9.5, MAG). **N2. Touch:
port.**

### 6.3 Doors, levers, chests, bodies and things on the ground

MM6:

- Doors open with a click or Space and slide on their own speeds; each map has its own door
  sounds [MMX `MapDoor`, `Game.MapDoorSound`]. Locked doors refuse, and the member says so; some
  need a key (Goblinwatch's doors refuse a party without its key, with a line saying so [2DE]). Puzzles
  are clicked: the 16-button pattern door in Goblinwatch [MAN, walkthrough]. Verified.
- Chests open a chest window over the view with the items in a grid; a trap may go off on opening
  [MAN; MMX `Screens.Chest`]; the patch can show the paper doll beside it [GF-P]. Verified.
- Bodies are searched with a click or Space; the status line reports gold and items [MAN; GLB].
  Verified.
- Players click everything: torches, rocks, trees and stones hide gold and open passages [CYB;
  CH]. Every decoration and wall face can carry an event and a hover name [MMX evt commands].
  Verified.
- Items on the ground are picked up into the hand (5.2); an item dropped from the hand is thrown
  ahead [CARD].

Project: none of these exist (GAPS 29; ITM 4.8). Props are named on a tap and nothing else.

Fix for the interface, once GAPS 29 and ITM 4.8 land: one "use" path for tap and a Use control,
5 m reach, the member's reaction line, item-in-hand pickup and throw (part of 9.2). 4 h. **N2.
Touch: port** (the item in hand is a redesign, 9.2).

### 6.4 Examine pop-ups

MM6 shows each while the right button is held (verified unless marked):

| Thing       | Content                                                                                                                | Source                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Item        | picture, name, type, armour or damage, description, value; "Not Identified" and "Broken Item" states; charges on wands | SHOT-20; GLB; ITM 5.6                                                |
| Spell       | picture, name, school, spell point cost, description, Normal / Expert / Master lines                                   | SHOT-25                                                              |
| Skill       | name, description, the three rank lines; hovering a skill tells what raising it costs, or how many points are missing  | SHOT-23                                                              |
| Statistic   | a description of the statistic and what it does                                                                        | CARD; MAN                                                            |
| Experience  | how much more is needed; the patch adds the level the member can train to                                              | CYB; GF-P                                                            |
| Monster     | its picture and hit points; its spell states (charmed, shrunk, slowed, feebleminded)                                   | CARD (hit points); GF-P (picture); GLB (states); the rest unverified |
| Portrait    | the member's state, the ready spell and active spells                                                                  | GLB labels; layout inferred                                          |
| Party buffs | the active spells with their time left                                                                                 | GLB; GF-P (duration display)                                         |
| Gold, food  | gold carried and in the bank; food                                                                                     | GLB                                                                  |
| Creation    | right-click any skill, class or statistic                                                                              | CARD                                                                 |

The patch adds: hints shown while the right button is held, items unidentified painted green, the
recovery time in Attack and Shoot [GF-P].

Project: none. Item and slot rows carry a browser `title` (`src/ui/inventory.ts` line 51); spell
places carry a `title` with level and cost (`src/ui/spellbook.ts` line 134); a phone shows
neither.

Fix: one pop-up component on the screens' stone with MM6's layout (2 h); the press-and-hold
gesture in the world and on every screen (2 h); content per kind: items 3 h, spells 2 h, skills 2 h,
statistics 2 h (our own help texts), monsters 3 h, portraits and buffs 2 h, gold and food 0.5 h.
18 h. **N1. Touch: redesign (hold for the right button).**

### 6.5 Message boxes and questions

MM6 [MMX `Screens`, evt commands; GLB; GF-P]:

- A simple message over the view (an obelisk's, for one); in the original any key dismissed it,
  which the patch changed [GF-P]. Verified.
- A question with a typed answer: a door that asks a password, a riddle [MMX `Question`]. Verified.
- The map-edge prompt and the entrance screen (10.5).
- A confirmation before quitting or starting a new game: click again to be sure [GLB]. Verified.
- An internal-error box that offers to autosave first [GLB]. Verified.

Project: none; everything goes to the status line.

Fix: a message panel and a question panel with a text field on the screens' stone (3 h); the
on-screen keyboard is the phone's (iOS raises it for an input). **N2. Touch: port.**

## 7. The fight as an interface

The rules (to-hit, recovery, the turn queue) are CHR 9; this section is what the player does and
sees.

### 7.1 Picking the attacker and the target

- MM6: click a portrait (or 1–4) to choose who acts, then click the monster: that member swings, or
  shoots if the foe is far and a bow is ready, or dodges and passes [MAN, combat and walkthrough].
  A attacks the nearest foe without aiming [MAN; CARD]. After acting the selection moves to a
  ready member [CHR 9.1]. Verified.
- The A key's choice in the MM7 engine: the monster under the pointer if any, else the nearest
  within 5,120 units; a blow within 407 units of its edge; else the bow; else a swing at the air
  that still costs recovery [OE `Character.cpp`]. Inferred.
- Project: a tap on a monster attacks with the selected member if ready, else the next ready one
  (`src/game/party.ts` lines 220–249); a bow shoots at any range, a blade answers "cannot reach"
  beyond 3.5 m (`src/dev/index.ts` lines 595–611). **Present but deviates** (CHR 9.1 has the
  fix for strike-when-near and pass).
- Missing: the attack-nearest control. A phone player needs it more than a mouse player: a small
  monster at 30 m is a few pixels wide.

Fix: an attack oval on the band, or a tap on open ground with a foe within 51 m (owner, section
14), both running A's choice above. 2 h. **N1. Touch: redesign.**

### 7.2 Aiming spells and the quick spell

- MM6: a weapon spell cast from the book or with S goes at the nearest foe; a spell that needs a
  subject turns the pointer into a crosshair ("Select Target") and the next click on a face or a
  monster casts it; Ctrl + click casts the quick spell at the thing clicked [MAN; CARD; GLB].
  Verified. Bolts are missiles that fly and can miss or hit something else [MAG 3.4].
- Project: a bolt picks the living monster nearest the middle of the view within 40 m and 28°
  (`src/world/spell-target.ts` lines 21–56) and flies at it (`src/world/spellfx.ts`); a member
  spell waits for a portrait tap (`src/ui/spellbook.ts` lines 95–114). The book closes for spells
  at the world or a monster (`src/dev/index.ts` line 712). No quick spell: MAG 5.2.
- Gap: no quick spell, no Ctrl + click equivalent, no crosshair state the player can see.

Fix: the Cast oval (5.4): tap casts the selected member's quick spell, aiming as MM6 does; while
a member spell waits, the status line reads "Select Target" and the portraits glow; a tap on a
monster while armed aims it. 4 h on top of MAG 5.2's store. **N1. Touch: redesign.**

### 7.3 Turn-based mode, the interface

- MM6: Enter toggles at any moment; a mode indicator shows over the view; in turns the party
  cannot walk, run or fly, but can turn, attack and cast; foes freeze while the members act and
  the members freeze while foes act; the party cannot rest in turns [MAN, keys and combat; CARD;
  GLB]. A review of MM7 notes that MM7's turns added a movement phase MM6's lacked [UHS]. Verified.
  Veterans fight most dungeon rooms in turns [LP introduction].
- Unpatched, a turn took twice as long as intended; the patch adds speed settings [GF-P].
- Project: Missing (DESIGN 7, owner, 2026-10-11). CHR 9.9 sizes the mode at 40–60 h.
- The interface on top: a toggle in the band (an hourglass oval), the indicator, the stick and
  running disabled in turns while looking and turning stay live, the attack and Cast ovals working
  in the member's phase, the portraits showing whose turn it is. 2 h on top of CHR 9.9. **N1. Touch:
  port** (one more control).

### 7.4 What a blow looks and sounds like

- MM6: the monster plays its got-hit frames and sound [MMX monster sounds], the status line tells
  the damage (if "show damage" is on [CARD]), the struck member's face winces and the member may
  cry out [MMX face animations; OE]; a dead monster drops into a corpse to search. The patch notes
  the party had tried to attack monsters in their death frames [GF-P]. Faces and sounds verified
  as features, their sets inferred.
- Project (DESIGN 14.4, the owner's reel, `src/world/combat-feedback.ts` lines 32–40, 91–126): a
  white flash, a synthetic whack or thud, a blood burst, a 0.45 m shove, a 0.07 s freeze and a
  camera shake; a red wash at 35 % when the party is struck (lines 62–71, 142–145).
- Gap: the freeze and the shake are not MM6's; DESIGN 14.4 says MM6 tinted the screen when the
  party was struck, which no source here confirms. Faces, voices and per-monster sounds are
  missing (8.1, 12).
- Fix: none to the reel without the owner. Make the red wash and shake optional in Controls, so
  a purist can play MM6's flat hit (0.5 h). **N2. Touch: port.**

## 8. The HUD's live parts

### 8.1 Portraits and their faces

MM6:

- Oval portraits of photographed people [SHOT-17; LP]; the selected member's oval is ringed in
  light [SHOT-17]. Verified.
- The faces move. Each event picks an expression at random from a list per face and plays it from
  the portrait frame table; one expression lip-syncs a voice line for as long as it plays [MMX
  faces module]. Idle faces blink, glance aside, purse their lips (SHOT-20's second face looks
  away; the German capture's third has its eyes shut). Conditions have faces of their own (weak,
  asleep, afraid, drunk, insane, poisoned, diseased, paralysed, unconscious, stoned); blows give
  winces by size; casting, smiling, refusing, falling have expressions [OE `PortraitId`; MMX
  `const.FaceAnimation`]. A dead member shows a gravestone in the oval, the gem goes out and the
  hit point tube empties [capture 2026-07-09]. A quest, an award and an autonote each play a sound
  and an effect on the faces [MMX `ShowQuestEffect`, `ShowAwardEffect`, `ShowAutonoteEffect`].
  The animation system is verified for MM6; the exact expression set per face is inferred.

Project (`src/ui/hud.ts` lines 82–132, 147–162): a gold class sigil in each oval (no face, by the
owner's rule of 2026-10-17: no generated faces, DESIGN 16.5); the selected ring brighter; the
sigil dimmed while recovering (`hud.css` line 118); greyed when dead (line 121). **Partial.**

Fix: an expression player per portrait (idle loop, condition face, wince, talk while a voice plays,
the gravestone, the quest and award flashes): 8 h of code. The faces are art: MM6 filmed actors;
the owner's handcrafted rule needs painted portraits with every expression frame each face uses
(the MM7 engine names about forty portrait states [OE]; DESIGN 12). **N1. Touch: port.** + art.

### 8.2 The gem

MM6: green with no monster near, yellow with one some way off, red when one is close; unreliable
indoors; dark while the member recovers; the party can rest only on green [MAN, combat and rest].
Verified. The MM7 engine's thresholds: a hostile within 5,120 units turns it yellow, within 307
red [OE `Actor.cpp` `MakeActorAIList_ODM`]. Inferred.

Project: the condition (`gemClass`, `hud.ts` lines 32–38, set at lines 153–155).

Fix: CHR 10.5 (3 h). Move the condition to the face (8.1) and the sheet. **N1. Touch: port.**

### 8.3 The tubes

MM6: a green hit point tube and a blue spell point tube to the right of each oval [SHOT-17]. The
MM7 engine's hit point tube turns yellow at half and red at a quarter; the spell tube stays blue
[OE `UIGame.cpp`]. Inferred. A dead member's hit tube is empty while the spell tube keeps its
level [capture 2026-07-09]. Verified.

Project: green and blue fills in whole pixels (`hud.ts` lines 44–49, 150–152); always green.

Fix: the colour steps (1 h). **N2. Touch: port.**

### 8.4 Buff icons and the mode indicator

MM6 [CARD screen diagram; MAN, game screens]: small icons on the band for each member's Bless,
Heroism, Haste, Shield and Stone Skin; the strip under the hireling windows lists the party's
spells (the protections, Feather Fall, Wizard Eye, Torch Light) and names them on hover (the
patch fixed its display of durations like a day and five minutes [GF-P]); the Guardian Angel and
Fly and Water Walk icons down the view's left edge; the turn-mode indicator near its foot.
Verified (the icons' art and exact places unverified).

Project: none; no buff store exists (MAG 5.5).

Fix: 4 h after MAG 5.5: member icons on the band, the party strip (wherever section 3 puts it),
the view icons, the hold pop-up with times (6.4). **N2. Touch: port.**

### 8.5 The minimap and the compass

MM6 [SHOT-17, 24, 30, 32; MAN; GLB]:

- An arched window at the top of the right panel. Outdoors it shows the land itself: terrain
  colours, roads, the buildings' roofs. The map stays north-up and a white arrow in the middle
  turns with the party (the arrow points up-left with the compass on NW in SHOT-30, up-right on NE
  in SHOT-32). Verified.
- A − and a + button on the arch zoom it (hints "Zoom Out", "Zoom In"); + and − keys too. The
  patch made the zoom remembered indoors as well as outdoors [GF-P]. The MM7 engine zooms
  outdoors from 512 to 2,048 and indoors from 256 to 4,096 [OE]. Verified (buttons); inferred
  (ranges).
- The compass is a strip of letters scrolling under a small plate over the arch: it reads N, NW,
  W·N, ·NE as the party turns [SHOT]. Verified.
- Indoors the map draws the outlines of the walls the party has seen; outdoors the MM7 engine
  keeps fully and partly revealed cells [OE `Outdoor.cpp`]. Inferred for MM6.
- Wizard Eye adds dots: foes red, friends green, corpses yellow; Expert adds items, Master points
  of interest [LP; MAG 4.2]. Reported.
- Pointing at the map names the building under the pointer outdoors, or the map indoors [OE
  `GameUI_GetMinimapHintText`]. Inferred.

Project: none on the HUD. The automap rules exist (`src/game/automap.ts`): cells revealed in a disc
of 40 m outdoors and 6 m indoors every half second (`src/dev/index.ts` lines 868–875).

Fix: an arched minimap with MM6's frame: outdoors the region's terrain painted once to a bitmap
from its splat, roads and roofs (6 h), revealed by the automap; indoors the walls seen, which needs
the level's floor-plan outlines that DESIGN 11.8 plans and the compile step does not yet write
(6 h); the arrow, north-up, − and + zoom, a tap opens the Map book (2 h); the compass strip (2 h).
16 h. **N1. Touch: port** (placement is section 3's redesign).

### 8.6 The clock and the date

MM6: no clock on the main screen [SHOT-17 to 32]. The rest screen shows the time in the 12-hour
form with am or pm and the day, month and year as numbers [SHOT-30; GLB "am", "pm"]; the Calendar
book shows the time [GLB "Time in Enroth"]. The patch says its right-button hints help a player
check the current time, which implies the time is a hover hint on the main screen [GF-P]; the MM7 engine shows hour, minute, am/pm, weekday, day, month and year when the pointer
rests on a HUD button [OE `UIMSG_ShowStatus_DateTime`]. The manual's screen diagram names a
Night/Day indicator [MAN]. Verified (no clock; am/pm); inferred (where the hint lives).

Project: a plaque at the band's left with the hour in 24-hour form and the weekday (`hud.ts` lines
73–78, 164–177; `src/game/time.ts` lines 126–134).

Gap: ours shows a clock MM6 does not, in a format MM6 does not use. On a phone with no hover the
clock is a fair answer; the format is not.

Fix: am/pm in MM6's form everywhere (0.5 h); the owner keeps or drops the plaque (section 14);
a tap on the sky or the minimap's frame tells the time and date in the status line, MM6's hover
(0.5 h). 1 h. **N2. Touch: redesign (no hover).**

### 8.7 Food and gold

MM6: an apple with the rations and a coin stack with the gold, always on screen [SHOT-17].
Pointing at the gold gives the gold carried and the bank's balance, at the apple the rations
[GLB]. Finding or losing food or gold reports it [GLB]. Verified. A new game shows 7 food and
200 gold [SHOT-17, at New Sorpigal's gate].

Project: food and gold appear only in the rest and service screens (`src/ui/rest.ts` line 22;
`src/ui/services.ts` line 27). **Missing on the HUD.**

Fix: two counters (where section 3 puts them) with the tap lines. 2 h. **N1. Touch: port.**

### 8.8 Books and buttons

| MM6                                                               | Key | Project                                                         |
| ----------------------------------------------------------------- | --- | --------------------------------------------------------------- |
| Quest book (a sword on the spine)                                 | Q   | Quests spine, with MM6's Calendar key painted on it             |
| Notes book (a quill)                                              | N   | none                                                            |
| Map book (a globe)                                                | M   | Map spine (globe)                                               |
| Calendar book (a key-like sceptre)                                | T   | none                                                            |
| Cast Spell oval (a star)                                          | C   | Spells spine (MM6's quill painted on it)                        |
| Rest oval (a tent)                                                | R   | Rest coin (a moon)                                              |
| Quick Reference oval (a scroll)                                   | Z   | none                                                            |
| Game Options oval (a disk)                                        | Esc | none                                                            |
| the character screen opens from a second tap on the selected face | 1–4 | also a Sheet spine (MM6's sword) and an Items spine (a satchel) |

[SHOT-17; MAN; CARD; `src/ui/screens.ts` lines 40–47, 86–101; `src/ui/paint.ts` lines 526–603.]
Verified.

Fix: MM6's four books with their emblems on the right spines; the four ovals with MM6's glyphs;
drop the Sheet and Items spines (the face opens the character screen; the Items page is its third
button, 9.1). 2 h, with the new books' screens sized in section 9. **N1. Touch: port.**

### 8.9 Hireling windows

MM6: two stained-glass windows under the minimap; a hired person's face fills one; a click on it,
or the key 5 or 6, talks to them [MAN; LP; capture 2026-07-09]. Verified.

Project: none; hirelings are GAPS 25. Fix: 2 h once hirelings exist. **N2. Touch: port.**

## 9. Screens

All MM6 screens pause the world (the patch fixed the one that did not, Enchant Item [GF-P]); so
do the project's (`src/dev/index.ts` line 837). **Present.**

### 9.1 The character screen

MM6 [SHOT-19 to 23; MAN; CARD]:

- Opens from a second click on the selected face (or its number again). Four pages chosen by five
  gold ovals under the page: Stats (a head), Skills (a fist), Inventory (crossed things), Awards (a
  medal) and Exit (an arrow into a door). The paper doll fills the right panel on every page; Tab
  moves to the next member and the page follows; Esc leaves. Verified.
- Stats: the content is CHR 4.6. Holding the right button on any line explains it [CARD].
- Skills: four boxes (Weapons, Magic, Armor, Misc); the row under the pointer turns red and the
  status line says what raising it costs or how many points are missing; a click raises it; a
  held right button shows the skill's ranks (SHOT-23). Verified.
- Awards: the member's awards (MMX `AutoAward`; GLB "Awards for"); the patch fixed it not
  refreshing on Tab [GF-P]. Verified.

Project: a Sheet screen (statistics, combat numbers and skills on one page, `src/ui/sheet.ts`
lines 94–112) and a separate Items screen, both from the shelf; the member chosen by a portrait
tap (DESIGN 16.15); a skill row is its own button and shows its cost (lines 62–92); no Awards; no
doll; closed by a cross (`src/ui/dom.ts` lines 129–131; `paint.ts` line 2421), not MM6's
door-and-arrow glyph.

Fix: one character screen with MM6's four pages and five ovals, opened from the face (2 h); the
skill row's cost and shortfall in the status line (0.5 h); Awards (2 h with GAPS 27's data); the
exit glyph (0.5 h); the doll (9.2). 5 h. **N2. Touch: port.**

### 9.2 The inventory

MM6 [SHOT-19, 20; MAN; CARD; MMX paper doll module]:

- The 14 × 9 grid over the view; pictures that span cells (a book 2 × 2, a scroll 2 × 1).
- A click lifts an item into the hand; a click puts it down. In hand: the doll equips or uses it
  (drinks a potion, reads a scroll, learns a spellbook), a face gives it, a right-click on a face
  makes that member use it, a right-click on a potion mixes. Holding the right button on an item in
  the pack shows its pop-up; identify and repair by right-clicking it in the pack, by the member's
  skill [MAN]. Verified.
- The paper doll stands in the right panel (at x 481 on the 640 screen [MMX]). A magnifying glass
  at its foot opens a close-up of the hand with six rings, the amulet and the gauntlets [MMX doll
  pieces `Magnify`, `Ring1`–`Ring6`]. Spears count as two-handed without a second weapon [MMX].
  Verified.
- New items fill the pack row by row in the original; the patch fills it column by column [GF-P].
  Inferred from the patch note.
- Whether a drop on an occupied cell swaps the two: unverified.

Project (`src/ui/inventory.ts`; `src/ui/inventory-model.ts` lines 189–353): a tap selects an item,
a tap on a free cell moves it, a tap on a slot row equips; action buttons for Equip, Take off,
Use or Read; Give buttons per member (lines 86–131 of `inventory.ts`); a list of slots in place of
the doll; glyph tiles with names on wide items; the pack filled row by row (`findFreeSlot`,
`src/game/inventory.ts` lines 79–89). **Partial.**

Fix:

- The item in hand across screens and the world (the 5.4 row): give by a portrait tap, drop or
  throw by a tap on the view, place by a cell tap; drag as a bonus, since a drag is a native touch
  gesture (6 h).
- The doll with drop targets per slot, the magnifier's accessory view (10 h of code; the doll and
  its overlays are DESIGN 12's art).
- Identify and repair from the pack by the member's skill (ITM 5) through the hold pop-up (1 h).
- 17 h. **N2. Touch: redesign (the hand).** + art.

### 9.3 The spellbook

MM6 [SHOT-24, 25; CARD; MAN]:

- One school a page, its picture in the first place and eleven places by level; bookmarks for the
  schools known; Tab cycles them; arrows and Enter cast from the keyboard.
- **A first click selects the spell (the status line says "Select …"), a second casts it.** A tab
  at the book's foot (a hand with a spark) sets the selected spell as the quick spell; Space does
  the same; another click there removes it (its hint says so [GLB]). The
  patched game adds a second tab for its attack spell (SHOT-24); the original has only the hand
  and the exit [capture 2026-07-09]. Verified.
- Holding the right button on a spell shows its pop-up (SHOT-25).

Project (`src/ui/spellbook.ts`): MM6's spread with bookmarks (lines 58–77, 153–184); **one tap
casts** (lines 95–114, 136–140); a spell that cannot be cast explains itself in the foot line; no
quick spell; no pop-up.

Fix: select then cast; the hand tab sets and clears the quick spell; the pop-up on hold; the
status line's "Select …". 3 h (the quick spell's store is MAG 5.2). **N1. Touch: port.**

### 9.4 Quests, Notes, Calendar

MM6 [SHOT-31; GLB; ANT; MMX `Screens.Info`]:

- **Quests** (Q): "Current Quests", one paragraph per quest in hand, a blackletter banner (SHOT-31).
  Verified for the layout. Whether finished quests stay in the book: unverified (no capture shows
  a list of them).
- **Notes** (N): the autonotes in five categories: potions, fountains, obelisks, seers and
  miscellaneous [GLB; ANT: about 115 notes, 44 of them fountain and well effects]. A new note plays
  a sound and an effect on the face [MMX]. Verified.
- **Calendar** (T): MM6's strings for it include the time in Enroth, the moon and its phases (new,
  quarter, half, three quarters, full), dawn, day, dusk, night and the location [GLB]. Reported;
  the layout is unverified.

Project: Quests only, active and completed lists with the current objective (`src/ui/journal.ts`
lines 10–38). Notes and Calendar are missing (GAPS 27).

Fix: the Notes book with five tabs (3 h, content follows the world), the Calendar (3 h), the
quest book as MM6's single list (0.5 h, or keep ours: a phone player benefits from the
objectives). 7 h. **N2. Touch: port.**

### 9.5 The Map book

MM6: the current map large, with zoom in and out (+ and − keys and buttons) and scroll buttons in
four directions [MAN; GLB "Scroll Up", "Scroll Down", "Scroll Left", "Scroll Right"]; the party's
arrow; the same picture as the minimap. Verified (controls); inferred (picture).

Project (`src/ui/journal.ts` lines 40–93): a 720 × 300 canvas of walked cells as sepia blocks and
a red arrow; no zoom, no scroll, no terrain, no walls (GAPS 30).

Fix: the minimap's bitmap at full size, pinch and two-finger pan, + and − ovals as MM6's (4 h after
8.5). **N2. Touch: port** (pinch is the phone's zoom).

### 9.6 The Quick Reference

MM6: Z or a gold oval opens one page summarising the four members. MM6's interface strings carry
short column labels that fit such a table (HP, SP, AC, Attack, Dmg, Cond, QSpell, Exp.) and
fame and reputation [GLB; MMX `Screens.QuickReference`]. Screen verified; columns inferred.

Project: none. Fix: one table page (3 h). **N2. Touch: port.**

### 9.7 The rest screen

MM6 [SHOT-30; CARD; MAN; GLB]:

- A painted landscape across the top; "Rest & Heal 8 Hours" with an apple and the rations it will
  eat (by the ground, CHR 14.2); "Wait without healing" over three waits: until dawn (6:00 by MM6's
  card, 5:00 by MM7's [MM7CARD]), one hour, five minutes; an hourglass in a green-marble well
  beside the time (9:12 am) and day, month and year; "Exit Rest".
- Resting runs the clock visibly with the hourglass; Esc or Exit skips the wait's animation. Foes
  can interrupt a camp ("Encounter!") and the members wake one by one; no rest near foes, in turns
  or without food, each with its line. Verified.

Project (`src/ui/rest.ts` lines 10–69; `rest-model.ts`): the time in 24-hour form, the date, light or
dark, the food, each member's points, "Rest 8 hours", "Wait until dawn" (to 5:00, `src/game/
time.ts` line 16), "Cancel"; the result as text lines at once. **Present but deviates.**

Fix: MM6's layout with the three waits (1 h), the hourglass and a running clock for a couple of
seconds, skippable (2 h), the blocks and the ambush through CHR 14's rules (their sizes are
there), the painted landscape (art). 3 h here. **N1. Touch: port.**

## 10. Houses, people and passages

### 10.1 Going into a house

MM6 [SHOT-26 to 29; 2DE; GLB; GF-P; MMX `Screens.House`, `HouseScreens`]:

- Pointing at a door names the house; a click within reach goes in. A closed house says when it
  opens (6 am to 6 pm for a smithy; the hours in MM6's house table: weapon and armour shops 6 to
  18, magic shops 8 to 16, temples 5 to 1, taverns 5 to 2, banks 9 to 17, training halls 6 to 18,
  town halls 10 to 14, coaches and ships 5 to 18) and the member grumbles [2DE; GLB; OE reaction
  list]. Verified (hours, the line); inferred (the voice).
- Inside, the view becomes the house: a filmed room that loops (the original restarted it at every
  topic, the patch stopped that [GF-P]); the right panel shows the house's name at the top, the
  keeper's framed portrait and name with their trade in blue ("Dirk the Innkeep"), the house's
  topics as lines, and the exit oval; band, food and gold stay [SHOT-27, 28]. A click on the
  keeper's portrait starts the talk [MAN]. A home lists its residents to choose from (`ChoosePerson`
  [MMX]). Verified.
- **Leaving turns the party round to face away from the door**: the unpatched game always did, the
  patch made it an option [GF-P]. Verified.

Project: a tap within 9 m opens a stone service screen titled with the house's name (`src/dev/
index.ts` lines 653–663; `src/ui/screens.ts` lines 120–148, 156–159), the member chosen by tabs
(`src/ui/services.ts`); no room, no keeper, no hours, no turn on exit; the autosave runs on close.
**Present but deviates.**

Fix: the house screen in MM6's shape: a picture of the room (art; MM6's were films), the keeper's
portrait (art) and name, the topics as lines (4 h); opening hours with the closed line (1 h, data
from WLD 4); the turn on exit (0.5 h). 6 h + art. **N2. Touch: port.**

### 10.2 Shops

MM6 [SHOT-28, 29; MAN; GLB; MMX `HouseScreens`]: the keeper's menu (Buy, Sell, Identify, Repair,
Special); Buy lays the goods on shelves or racks over the view ("Select the Item to Buy");
pointing at a piece makes the keeper quote its price; a held right button shows the item; a click
buys. Sell, Identify and Repair open the selected member's pack over the view; pointing quotes
the offer or the fee; a click does it. Verified. The selected member deals and a click on another
face changes who (inferred); a double click on a face in a Buy screen opens that member's pack
[MMX `Screens.InventoryInShop`].

Project (`src/ui/services.ts` lines 194–255): two lists, the stock with Buy buttons and the
member's pack with Sell, Identify and Repair buttons, prices in each button's note; member tabs
(lines 201–207). **Present but deviates.**

Gap: a shop is a spreadsheet. On a phone the hover price becomes a tap: tap a piece to see its
price in the status line, tap again to buy.

Fix: the shelf view (items drawn on the shelf art at their own size, 4 h + art), the pack view
reusing the inventory grid with tap-to-quote and tap-again (3 h), the keeper's lines (ITM 6.7).
7 h + art. **N2. Touch: redesign (tap to quote).**

### 10.3 The other houses' menus

MM6, from the house screens [MMX `HouseScreens`; GLB; SHOT-27] (prices and rules are ITM, CHR,
WLD):

| House       | MM6's lines                                                                            | Project                                           |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Tavern      | rent a room for N gold; fill packs to N days for M gold; have a drink; tip the barkeep | rent a room; buy food (`services.ts` lines 35–81) |
| Temple      | heal; donate                                                                           | heal per member (lines 83–110)                    |
| Guild       | buy spells from a shelf of books, a pointer naming each spell and price; join          | join; a list of books (lines 112–161)             |
| Training    | train to level N for M gold; or how much experience is missing                         | train per member (lines 163–192)                  |
| Bank        | deposit; withdraw; each asks how much and takes a typed amount                         | none                                              |
| Coach, ship | destinations with days and price; none today on the wrong weekday                      | none                                              |
| Town hall   | the bounty, the quests                                                                 | none                                              |
| Teacher     | become Expert or Master in a skill for N gold                                          | none                                              |

Fix: the missing lines with their systems; the typed amount (1 h with 6.5's question panel).
**N2. Touch: port.**

### 10.4 Talking with people

MM6 [MAN; CARD; LP; MMX `HouseScreens`]: a street person's portrait and name in the right panel,
their words, two topics drawn from their profession and news, Join (hire, with the fee), and when they
refuse to talk, Beg, Threaten and Bribe, each costing reputation [CARD]. Keyboard control of
conversations came with the patch [GF-P]. Verified.

Project (`src/ui/dialogue.ts`; DESIGN 16.7): a wooden panel at the right with the villager's live
3D face, name and calling, words, topics, rumours told in turn, quest stages, Farewell (lines
96–143). **Present but deviates**, by the owner's choice of a live face over a painted one.

Missing: Join, Beg, Threaten, Bribe (GAPS 25, 26). 2 h each once hirelings and reputation exist.
**N2. Touch: port.**

### 10.5 Dungeon doors and the edge of a region

MM6:

- A dungeon's entrance is a screen of its own: its picture, its name, "Enter …", and for some a
  short description or a refusal (Goblinwatch's locked doors until the party holds its key;
  Warlord's Fortress sealed from inside) [2DE: 20 dungeon, 8 temple and 6 castle
  entrances with their pictures; TRN; GLB]. Castles go through an entrance screen to a throne room
  [2DE]. Verified.
- Leaving a dungeon asks for confirmation [GLB]. Verified.
- Walking off an outdoor map's edge asks whether to leave, says how many days the journey takes
  and to where, and offers to travel or stay [GLB]; the days pass on the clock (WLD 4.8; the patch
  fixed this prompt firing while flying low [GF-P]). Verified.
- The game autosaves at every exit from a level [CARD], and after travel [GF-P].
- The loading screen is one picture with a fireball crossing it toward a demon as the bar [LP].

Project: portals are discs; stepping in lowers the veil and reloads the page on the other level
(`src/world/portals.ts` lines 19–67; `src/dev/index.ts` lines 493–502); no question, no picture,
no days; the veil names the place (`src/app/veil.ts`). **Present but deviates.**

Fix: an entrance screen with the picture, Enter and Leave, and the key check (3 h + one picture
per entrance); the region-edge prompt with days passing (2 h); the autosave already runs before a
portal (`src/dev/index.ts` line 496). 5 h + art. **N2. Touch: port.**

## 11. Shell: menu, saves, options, the start and the end

The production build boots an empty scene; the game is the dev build (`src/main.ts` lines 60–67;
GAPS "First"). Everything below is missing from the shipped app.

### 11.1 The start

MM6 [CARD; MAN; LP; GLB; MMX]:

- An intro film (Esc skips) and the Main Menu. New Game shows the story briefing (a narrated CD
  track: MMX `NarratorTrack`, MM6 only), then Create Party or Quick Start, which takes the four
  ready-made members Roderick, Alexis, Serena and Zoltan [GLB]. Verified.
- Creation's interaction: arrows beside the face change portraits, a click on the name renames,
  the plus and minus buttons move the selected statistic, a click on a class applies it, two
  skills to pick, OK refused with a line while points are left or skills unpicked, a held right
  button explains any skill, class or statistic [CARD; GLB]. Verified. Rules: CHR 3.
- One loading screen, then the party stands outside New Sorpigal's gate with its gear in the packs,
  the spells as books to study and a letter to deliver [CARD; LP].

Project (dev build): straight into the valley with four test members, equipped
(`src/dev/index.ts` lines 279–292; `src/game/state.ts` lines 100–123); `?create` shows a
creation screen with tabs, a sex toggle and text initials (`src/ui/creation.ts`). **Missing**
(the flow), **Partial** (creation, CHR 3).

Fix: title screen, briefing, Create Party or Quick Start, MM6's creation layout (8 h; CHR 3 holds
the rules). **N1. Touch: port.**

### 11.2 The game menu

MM6 [SHOT-18; CARD; GLB]: Esc or the disk oval brings the menu over the view (band and panel
stay): Resume Game, Controls, New Game, Load Game, Save Game, Quit. New Game and Quit ask for a
second click to confirm. Verified.

Project: none. Fix: the menu on the screens' stone with MM6's blackletter buttons (2 h). **N1.
Touch: port.**

### 11.3 Saves

MM6 [CARD; GF-P]: Save Game: click a slot, type a name, press the check mark. Load Game: the first
entry is the autosave, made every time the party leaves a level; pick a save, press the check.
No quick save (the patch adds F11 and a quick load) [GF-P]; slots could not have gaps until the
patch [GF-P]; the patch also checks free space [GF-P]. The slot count and whether the list shows
a picture are unverified.

Project (`src/app/autosave.ts` lines 11–36): one slot in `localStorage`, written when a screen
closes, after a rest, before a portal and every 60 s (`src/dev/index.ts` lines 864–868); loaded
only through a portal or `?continue`, and then the party is put at the level's spawn (GAPS 32).

Fix: named slots in IndexedDB with the autosave first, save and load screens, the position from the
save (GAPS 32 sizes it M; the interface part 6 h). Keep the minute autosave: phones kill
backgrounded pages. **N1. Touch: port** (typing a name raises the phone's keyboard).

### 11.4 Controls (the options)

MM6's Controls screen [CARD]: music, sound and voice volume; detail low, medium or high; turn
rate 16 facings, 32 facings or smooth; walking sounds on or off; show damage on or off. Verified.
Not in MM6's card: always run, flip on exit, key configuration (MM7's card has them [MM7CARD]; the
patch adds them to MM6 through its ini file and a separate key tool [GF-P]; one player found a
Controls button inside the screen that did nothing [STEAM1]). The original set CD music to half the system volume
[GF-P].

Project: render presets and the filter in `src/app/settings.ts` (lines 9–14), the rest in the dev
panel (`src/dev/panel.ts`). **Missing** for the player.

Fix: a Controls screen with MM6's set translated: the three volumes (Babylon's audio engine has a
bus per kind), detail (the render presets), look and turn sensitivity in place of the turn rate,
walking sounds, show damage, and the phone's own (run threshold, magnetic level, the red wash).
4 h. **N2. Touch: redesign** (turn rate means nothing on a drag).

### 11.5 Death and the end

- MM6: a death film (the patch can skip it [GF-P]), then the party wakes to a line about having
  cheated death once more [GLB]; the rules (where, when, what is lost) are CHR 12.2. Verified.
- The win screen: congratulations, the members, the time it took ("Time saving Enroth"), the score;
  the game saves the screen as `MM6_WIN.PCX` to print; the original ignored input on it for five
  seconds [GLB; GF-P]. Verified.
- Project: none (GAPS 36). Fix: 2 h for the death message and screen, 2 h for the win screen when
  the ending exists. **N2. Touch: port.**

## 12. Sound and music

All the project's sound is synthesised through Babylon's audio engine (`src/app/audio.ts`,
`src/world/soundscape.ts`, `src/world/ambience.ts`), as CLAUDE.md requires; recordings and music
are DESIGN 10.7's pipeline (owner-made plus CC0). Babylon's `AudioEngineV2` streams and loops
music and buses volume; none of the fixes below needs a hand-built chain.

### 12.1 Footsteps

- MM6: a walking sound while the party moves, switchable in Controls [CARD]; the patch fixed it
  going missing [GF-P]. The MM7 engine plays a looped walk per ground kind with a separate running
  loop, wood on buildings and bridges, and a splash on stepping into water [OE `Outdoor.cpp`
  `walkSoundForTileset`]. Verified (exists); inferred (the set).
- Project: one synthetic footfall every 0.78 m, two takes per surface (grass, gravel, sand, snow,
  stone, water), the surface read from the splat under a ray (`soundscape.ts` lines 17–19, 83–161,
  245–263); props count as stone (line 142). No running variant, no wood.
- Fix: a walk loop and a run loop per ground kind (recordings), wood on props, the splash, the
  Controls switch. 3 h + audio. **N1. Touch: port.**

### 12.2 The fight

- MM6: per-monster attack, death, pain and fidget sounds [MMX `MonListItem.Sounds`; MON 2.14];
  weapon swings and hits; every spell its own sound [MMX `Game.SpellSounds`] and an impact; a
  member's cry when struck [OE]. Verified (monster and spell sets exist).
- Project: three synthetic impacts (whack, thud, whoosh) for every blow by or on the party
  (`audio.ts` lines 103–157; `combat-feedback.ts` lines 101, 111, 117, 125) and one rising sweep
  for every cast (`audio.ts` lines 132–137, 239–241).
- Fix: a sound table per monster kind and per spell, with an impact per element (4 h + audio).
  **N1. Touch: port.**

### 12.3 The interface

- MM6: the quest, award and autonote events each play a sound with the face effect [MMX]; level
  ups, coins found, items found, chests and doors (a door sound set per map [MMX
  `MapDoorSound`]), drinking and eating (MMX's examples name an eat sound) have theirs;
  the keepers have shop sounds [MMX `PlayShopSound`]. Verified (they exist); the button-press
  click is inferred.
- Project: a dry synthetic tick on every press (`src/ui/press.ts` lines 8–17; `audio.ts` lines
  138–142).
- Fix: a cue table for the events above as each system lands (2 h + audio). **N2. Touch: port.**

### 12.4 Voices

- MM6: each face has a voice; reactions are drawn at random from a list with up to two takes,
  and one face expression lip-syncs the line [MMX faces module]. The reaction kinds (MMX
  `const.FaceAnimation`, shared by the three games) include kills, a closed shop, traps disarmed or
  set off, damage avoided, identify and repair results, a quick spell set, cannot rest, a skill
  raised, no room, potions, a locked door, a door that will not budge, spells learnt or refused,
  greetings by time of day, hurt and each condition. Verified (system); inferred (MM6's exact
  set).
- Project: none.
- Fix: a reaction table and player (3 h) + recordings per face; the owner's face art decides how
  many voices (DESIGN 12). **N1. Touch: port.**

### 12.5 Ambience

- MM6: decorations can carry a sound, some only at dawn or at dusk [MMX `DecListItem.SoundId`,
  `SoundOnDawn`, `SoundOnDusk`]; maps place sound sources [MMX `Map.SoundSprites`]. Verified. Wind
  and birds as such are unverified for MM6.
- Project: a gusting wind loop outdoors (louder in the desert and with height), birds in the
  valley by day, waterfalls as line sources (`soundscape.ts` lines 31–80, 238–279;
  `ambience.ts`). More than MM6 may have had; keep.
- Fix: dawn and dusk cues on decorations (a cock at the farm, crickets by night) and fountain
  loops (2 h + audio). **N3. Touch: port.**

### 12.6 Music

MM6's map table gives each map a CD track [MST]:

| Track | Maps                                                                                                                                                                                                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | New Sorpigal, Castle Ironfist, Misty Islands, Bootleg Bay, Silver Cove, Eel-infested Waters (and the hidden NWC level)                                                                                                                                                                                            |
| 5     | Sweet Water; the Hive                                                                                                                                                                                                                                                                                             |
| 6     | Hermit's Isle, Blackshire, Dragonsand                                                                                                                                                                                                                                                                             |
| 7     | almost every dungeon (Shadow Guild, Hall of the Fire Lord, Snergle's mines and caverns, the Dragoons' and Silver Helm's holds, Corlagon's Estate, the Monolith, Ethric's tomb, Icewind Keep, Warlord's Fortress, Lair of the Wolf, Gharik's Forge, Agar's Laboratory, the Dragon Riders' caves, the dragon lairs) |
| 8     | Goblinwatch                                                                                                                                                                                                                                                                                                       |
| 9     | Abandoned Temple; Free Haven Sewer                                                                                                                                                                                                                                                                                |
| 10    | the Arena                                                                                                                                                                                                                                                                                                         |
| 11    | Tomb of VARN, the Oracle, the Control Center                                                                                                                                                                                                                                                                      |
| 12    | Kriegspire, Frozen Highlands                                                                                                                                                                                                                                                                                      |
| 13    | Mire of the Damned                                                                                                                                                                                                                                                                                                |
| 14    | every temple of Baa and the elemental temples, the castles Alamos, Darkmoor and Kriegspire                                                                                                                                                                                                                        |
| 16    | Paradise Valley, Free Haven                                                                                                                                                                                                                                                                                       |

- Tracks 2 to 16 exist on the CD [GF-P]; no map uses 3, 4 or 15, which are likely the title, the
  briefing's narration (MMX `TitleTrack`, `NarratorTrack`) and the ending (inferred). The music
  is on the second CD [GF-P]. Verified (the table).
- A map's track starts when it loads [MMX `PlayMapTrack`]. Whether it loops: the patch's
  `MusicLoopsCount` option, with 0 meaning forever, suggests the original played a track a set
  number of times and fell silent (inferred).
- Volume: a music slider in Controls [CARD]; the original drove CD audio at half the system
  volume [GF-P].
- Project: none.
- Fix: a music player on Babylon's engine (stream, loop count, a short fade across a portal,
  volume bus), the track per region in the level sidecar, the title and briefing tracks (5 h). The
  pieces: the owner's or CC0 (DESIGN 10.7); twelve map tracks fold into about nine moods (towns,
  dungeons, temples, the wilds, the swamp, the snow, the desert, special places, the arena).
  **N1. Touch: port.** + audio.

## 13. Day, night, weather and the view

### 13.1 How fast the day goes

- MM6: 256 ticks a game minute and 128 a real second [MMX `const.Minute`, `const.RTSecond`]: a game
  minute every two real seconds, a day in 48 real minutes. Constants verified; the rate inferred
  (GAPS 22).
- Project: one game minute per real second, a day in 24 minutes (`src/world/daylight.ts` line 13).
- Fix: 0.5 a minute per second, one constant (0.5 h). Buff and cure windows then match MAG's
  durations. **N3. Touch: port.**

### 13.2 Light by the hour

- MM6: outdoor light follows the clock and nights are dark; dungeons do not change. The patch fixed
  a minute of full brightness at 5:00 [GF-P], so the day's light turns at 5:00; "Wait until Dawn"
  goes to 6:00 by MM6's card [CARD]. The strings for dawn, day, dusk and night exist [GLB].
  Hours of dusk and night: unverified.
- Project: dawn 5:00 and dusk 21:00 (`src/game/time.ts` lines 16–17); a blend through a warm dusk to
  a blue night with stars and lanterns that come up (`daylight.ts` lines 49–94; DESIGN 16.3).
  **Present** in kind; the dusk hour is unverified either way.

### 13.3 The party's light

- The MM7 engine always lights a spot round the party indoors (800 units, about 8 m), outdoors only
  at night (1,024 units); Torch Light raises it to 800 × its power, and the light is a neutral grey
  [OE `Engine.cpp` `StackPartyTorchLight`]. Inferred. The manual's early text even says Torch Light
  works only indoors [MAN, spells].
- Project: a warm, flickering torch of 9 m, on everywhere and at every hour
  (`src/world/atmosphere.ts` lines 15–77).
- Fix: off outdoors by day, neutral rather than flame-coloured, radius by Torch Light's power
  (1 h). **N3. Touch: port.**

### 13.4 Weather

- MM6: fog comes by chance per map [MMX `Game.MapFogChances`]; map scripts turn snow on and off
  [MMX `evt.SetSnow`], and the patch fixed snow drifting too much while strafing [GF-P]. Verified.
  Rain: none known.
- Project: drifting cloud shadows everywhere, blowing sand, heat shimmer and mirage in the desert
  (DESIGN 15.7); rain and a sandstorm planned (PLAN 5b step 18).
- Fix: fog days and snowfall (6 h with particles); rain is ours, not MM6's. **N3. Touch: port.**

### 13.5 The view

|                  | MM6                                                                                             | Confidence                                   | Project                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| View box         | 460 × 344 at (8, 8) of 640 × 480                                                                | verified (SHOT-17; OE viewport 8–468, 8–352) | the full 932 × 430 canvas, the band over its foot (`boot.ts` line 52; `hud.css` line 12) |
| Across           | 75° outdoors, 60° indoors                                                                       | inferred (OE `Camera.h`)                     | about 106° between the pillars (66° vertical, `boot.ts` line 55)                         |
| Up and down      | ±30° outdoors, ±23° indoors, the horizon in the middle                                          | inferred                                     | 33° above the horizon and 19° below; the horizon 65 % down the visible view              |
| Size of things   | 300 px of focal length on the 640 grid outdoors, 398 indoors                                    | inferred                                     | 221 on the shell's grid: everything 74 % of MM6's size outdoors, 56 % indoors            |
| Pitch            | ±22.5°                                                                                          | verified (MMX)                               | ±60°                                                                                     |
| Monsters far off | indoors the original stopped drawing distant monsters; the patch draws them at any range [GF-P] | verified                                     | drawn to the far plane                                                                   |
| Sprites          | scaled with the view's pitch only in the patch [GF-P]                                           | verified                                     | creatures are 3D; tree sprites turn about their foot (DESIGN 16.14)                      |

Keeping MM6's magnification on the phone's wide view gives about 89° across and 40° up and down
outdoors, 73° by 31° indoors. That keeps sizes and corridors MM6's but shows much less sky and
floor; today's 106° by 52° shows more of both and makes rooms feel bigger than MM6's.

Fix: give the camera a viewport above the band so the horizon sits in the middle of what is seen
(1 h); a field of view per space kind (outdoor, indoor) at the owner's chosen compromise (1 h);
the pitch clamp (4.2). 2 h. **N1. Touch: redesign** (the phone's aspect forces the choice).

## 14. Decisions for the owner

Each of these changes an approved DESIGN decision or needs a touch design. Recommendation first.

1. **Where MM6's right panel goes** (section 3). Recommended: furniture over a full-width view
   (minimap inset at the top right, counters by the clock, ovals and books in the shelf); a true
   right panel only if the owner wants MM6's silhouette above all.
2. **Field of view** (13.5). Recommended: horizon centred in the visible view; outdoors about 90°
   across, indoors about 75°, then judged on the phone against MM6.
3. **Run** (4.1). Recommended: a short push walks and a push beyond 90 px runs at twice the walk.
   The original walks unless Shift is held; the patched GOG game runs unless it is.
4. **Backward and diagonal** (4.1). DESIGN 7.1 keeps a third and one axis. MM6 backs at the full walk
   and combines keys. Recommended: back at the full walk; keep one axis.
5. **Look while walking and the pitch limit** (4.2). Recommended: ±22.5° by default, pitch allowed
   while walking for vertical-dominant drags, two-finger tap to centre.
6. **A jump control** (4.3). DESIGN 7 says spell only; MM6 has both. Recommended: an upward flick of
   the left thumb.
7. **Attack the nearest** (7.1). Recommended: a gold attack oval; a tap on open ground is too easy to
   fire by accident.
8. **Press and hold is the right button** (5.4, 6.4). Recommended: reserve the hold for examine
   everywhere and never give it another meaning.
9. **The quick spell control** (7.2). Recommended: the Cast oval, a tap for the quick spell, a hold
   for the book.
10. **The item in hand** (9.2). Recommended: build it; give, drop and equip through it.
11. **The HUD clock** (8.6). MM6 shows none. Recommended: keep it (no hover on a phone) in MM6's am/pm
    form.
12. **Turn-based mode** (7.3; CHR 9.9; DESIGN 7).
13. **The reel's freeze, shake and red wash** (7.4): keep as the owner's, with an off switch.
14. **Original or patched**: always run, flip on exit, quick saves, mouse look's range, condition
    order, the column-first pack. The reference screenshots are of the patched game (section 1).
    Recommended: the original's rules with the patch's comforts where a phone needs them (a quick
    save, running as an option).

## 15. Ranked: the twenty gaps a player of the original notices most

Ranked by how soon and how strongly a player who knows MM6 feels each one. Hours are code and
tests; "+ art" and "+ audio" mark what the pipelines must also supply. Nine cheap fixes from the
list (the emblems, the view box and field, the pitch, run, the status strip, select-then-cast,
the attack oval, the rest layout, the counters) come to about 20 hours together.

| Rank | Gap                                                                                                | Section        | Size                    | Notice | Confidence                              | Touch    |
| ---- | -------------------------------------------------------------------------------------------------- | -------------- | ----------------------- | ------ | --------------------------------------- | -------- |
| 1    | Music by region, the title and briefing tracks                                                     | 12.6           | 5 h + audio             | N1     | verified                                | port     |
| 2    | Minimap with compass strip, north-up arrow, − and +                                                | 8.5            | 16 h                    | N1     | verified (indoor walls inferred)        | port     |
| 3    | MM6's furniture on the phone: food and gold, the four ovals, the four books with their own emblems | 3, 8.7, 8.8    | 12 h                    | N1     | verified                                | redesign |
| 4    | Faces that move and speak; the gem as enemy detector and recovery light                            | 8.1, 8.2, 12.4 | 14 h + art + audio      | N1     | verified (system)                       | port     |
| 5    | Field of view and pitch: horizon centred, MM6's magnification, ±22.5°                              | 13.5, 4.2      | 4 h                     | N1     | inferred (angles), verified (pitch)     | redesign |
| 6    | Run, and MM6's speeds for back and sidestep                                                        | 4.1            | 3 h                     | N1     | verified (keys), inferred (speeds)      | redesign |
| 7    | Examine on press and hold; the status strip always there                                           | 6.4, 6.1       | 21 h                    | N1     | verified                                | redesign |
| 8    | Turn-based mode, its toggle and indicator                                                          | 7.3            | 2 h + CHR 9.9's 40–60 h | N1     | verified                                | port     |
| 9    | The shell: title, briefing, Quick Start, menu, save slots, Controls                                | 11             | 20 h                    | N1     | verified                                | port     |
| 10   | Quick spell, attack the nearest, select-then-cast in the book                                      | 7.1, 7.2, 9.3  | 9 h                     | N1     | verified                                | redesign |
| 11   | Footstep loops for walk and run, per-spell and per-monster sounds, interface cues                  | 12.1–12.3      | 9 h + audio             | N1     | verified (they exist)                   | port     |
| 12   | The rest screen: three waits, the hourglass and a running clock                                    | 9.7            | 3 h + CHR 14            | N1     | verified                                | port     |
| 13   | Houses as rooms with keepers, opening hours, the turn on leaving                                   | 10.1           | 6 h + art               | N2     | verified                                | port     |
| 14   | Shops on shelves; sell, identify and repair in the pack                                            | 10.2           | 7 h + art               | N2     | verified                                | redesign |
| 15   | The item in hand, the paper doll, the ring view                                                    | 9.2            | 17 h + art              | N2     | verified                                | redesign |
| 16   | The character screen's four pages and Awards; Notes, Calendar, Quick Reference                     | 9.1, 9.4, 9.6  | 15 h                    | N2     | verified (calendar's layout unverified) | port     |
| 17   | Dungeon entrance screens and the region-edge prompt with days                                      | 10.5           | 5 h + art               | N2     | verified                                | port     |
| 18   | The Map book: the picture, zoom, pan                                                               | 9.5            | 4 h after rank 2        | N2     | verified (controls)                     | port     |
| 19   | Buff icons; the hit point tube's colours                                                           | 8.3, 8.4       | 5 h after MAG 5.5       | N2     | verified (icons), inferred (colours)    | port     |
| 20   | Jump, flight, and the water and falls                                                              | 4.3–4.6        | 9 h + CHR 13            | N2–N3  | verified (keys), inferred (numbers)     | redesign |

Below the cut: message boxes and typed answers (6.5, 3 h); reach of 5 m (6.2, 0.5 h); am/pm and a
tap for the time (8.6, 1 h); half-speed clock (13.1, 0.5 h); the party light by day (13.3, 1 h);
fog and snow (13.4, 6 h); hireling windows (8.9, 2 h); Join, Beg, Threaten, Bribe (10.4); the other
houses' lines (10.3); death and win screens (11.5, 4 h); dawn and dusk sounds (12.5, 2 h); a switch
for the reel's freeze, shake and red wash (7.4, 0.5 h); the exit glyph (9.1, 0.5 h).

## 16. What the owner should check in the original

Unpatched MM6 where possible (the reference screenshots are patched, section 1). With GrayFace's
patch and MMExtension's console most take minutes; record each answer in DESIGN when it lands.

1. **Speeds.** Time walking, running, backing and sidestepping across a measured stretch (New
   Sorpigal's square, a dungeon corridor), outdoors and indoors. The MM7 engine predicts back =
   walk and sidestep = ¾ of it outdoors, ½ indoors.
2. **Turning.** Time a full turn on the arrow keys with Turn Delta on smooth, with and without
   Shift (MM7 engine: 4 s and 2 s).
3. **Field of view.** With turn rate at 16 facings (22.5° a step), count the steps that carry a post
   from the view's left edge to its right, outdoors and in a corridor (MM7 engine: 3.3 and 2.7).
4. **Look limits.** How far Page Down and Delete tilt the view, and whether in steps.
5. **Jump.** The X key's height and length, standing and running; the Jump spell's.
6. **Flight.** The ceiling, the climb and forward speeds, whether forward flight follows the pitch.
7. **Falls.** The height at which a drop first hurts and the share of hit points it takes.
8. **The gem.** The distance at which it turns yellow and red outdoors; how it behaves indoors.
9. **The hit point tube.** Its colour at half and at a quarter.
10. **The time.** Where the pointer must rest to show it, and what the line says; what the
    manual's Night/Day indicator is.
11. **Wait until Dawn.** 5:00 or 6:00.
12. **The Calendar and the Quick Reference.** What each page shows.
13. **The monster pop-up.** What a right-click on a monster lists.
14. **Saves.** How many slots; whether the load list shows a picture.
15. **Music.** What plays on the title screen, in houses and during the briefing; whether a map's
    track loops or stops.
16. **Footsteps.** Loops or single steps; a different sound when running; which grounds differ.
17. **The pack.** Whether dropping an item on another swaps them.
18. **The party's light.** Its reach in a dungeon without Torch Light, and outdoors at night.
19. **A blow on the party.** Whether the view flashes red (DESIGN 14.4 says so).
20. **The minimap.** Whether outdoors it shows the whole land or only what was explored, and what
    pointing at it names.
21. **Status lines.** How long a message stays.
22. **Leaving a house.** Confirm the turn round in the unpatched game.

## 17. Sources

All public; read 2026-10-18. Downloaded pages were read as data only; nothing from them is in
this repository.

- **[MAN]** Might and Magic VI manual, The 3DO Company, 1998 (keys, mouse, game screens,
  character and inventory screens, exploring, buying and selling, combat and recovery, rest,
  spells, walkthrough). https://mocagh.org/nwc/mm6-manual.pdf
- **[CARD]** Might and Magic VI "Getting Started" reference card, New World Computing, 1998
  (main menu, creation, character screen, rest screen, Options screen and Controls, the game
  screen diagram, combat tips, keyboard and mouse charts). https://www.mocagh.org/nwc/mm6-startup.pdf
- **[MM7CARD]** Might and Magic VII reference card (MM7 only, for contrast).
  https://mocagh.org/nwc/mm7-refcard.pdf
- **[GLB]** MM6's interface strings, `GLOBAL.TXT`; **[MST]** `MapStats.txt` (the music track per
  map); **[2DE]** `2DEvents.txt` (houses, keepers, hours, entrances); **[ANT]** `Autonote.txt`;
  **[TRN]** `Trans.txt`: MM6's own English text tables as published by the mm678-i18n project,
  `source/en/mm6/data/10LocLANG.icons/`. https://github.com/might-and-magic/mm678-i18n
- **[GF-P]** GrayFace, MM6 Patch read-me (its fixes describe the original).
  https://grayface.github.io/mm/MM6PatchReadMe
- **[GF-M]** GrayFace, "Might and Magic Mechanics" (engagement distance).
  https://grayface.github.io/mm/mechanics/
- **[MMX]** GrayFace, MMExtension reference: `Party` (look angle, enemy detector bits),
  `Game` (status message, fly ceiling, door sounds, fog chances, spell sounds, title and narrator
  tracks), `const.Screens`, `const.HouseScreens`, `const.FaceAnimation`, the faces and paper doll
  modules, evt commands. https://grayface.github.io/mm/ext/ref/
- **[OE]** OpenEnroth, the open rebuild of the MM7 engine: `src/Application/GameConfig.h` (walk
  speed, party height and eyes, reach and info depths, minimap zoom, viewport, options), `src/Engine/Party.h`
  and `Party.cpp` (turn rate, jump, falls), `src/Engine/Graphics/Outdoor.cpp` and `Indoor.cpp`
  (movement, strafe, run, flight, walk sounds), `src/Engine/mm7_data.cpp` and `.h` (speed
  multipliers, melee range), `src/Engine/Objects/Actor.cpp` (the alert), `Character.cpp` (attack
  choice), `src/Engine/Engine.cpp` (the party light), `src/Engine/Graphics/Camera.h` (field of
  view), `src/GUI/UI/UIGame.cpp` (bars, minimap, time hint), `src/Engine/Objects/CharacterEnums.h`
  (portraits, reactions). MM7 only; never proof for MM6. https://github.com/OpenEnroth/OpenEnroth
- **[LP]** PurpleXVI, Let's Play Might and Magic 6: introduction and update 1.
  https://lparchive.org/Might-and-Magic-6/
- **[DOB]** D. G. Dobrev, "The Complete Guide to Might and Magic VI" (Jump, Fly, Water Walk).
  https://www.cheathappens.com/text/mm6guide.zip.txt
- **[CYB]** "Might and Magic 6 FAQ" (clicking scenery, experience colour).
  https://www.cyberly.org/game-cheats/pc-walkthroughs/might-and-magic-6-faq.html
- **[CH]** Celestial Heavens, MM6 basic tips and top ten tactics.
  https://www.celestialheavens.com/mm-vi/general-mmvi/basic-tips
- **[GOG1]** GOG forum, "mm6 slow movement" (walking against backing, always run, Shift).
  https://www.gog.com/forum/might_and_magic_series/mm6_slow_movement
- **[STEAM1]** Steam community, MM6 controls thread (Delete looks down; Enter for turns).
  https://steamcommunity.com/app/243380/discussions/0/846962439234363478
- **[UHS]** UHS review of Might and Magic VII (its turns add movement, unlike MM6's).
  https://uhs-hints.com/articles/reviews/mm7.php
- **[RPGC]** RPG Classics MM6 shrine (spell texts). http://tartarus.rpgclassics.com/mm6/
- **[SHOT-n]** The owner's MM6 screenshots in `artwork/reference/` (third-party, reference only):
  17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32 and the captures of 2026-07-09 14:48
  and 18:33.
- The project's files at commit `573790f`, as cited.
