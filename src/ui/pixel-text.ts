/**
 * Bitmap text (DESIGN.md 16.10). MM6's type was pixels with hard edges; a phone draws smooth,
 * anti-aliased type, which the owner reads as modern. So every run of text in the UI layer is
 * painted onto a canvas on the game's pixel grid (`PX` CSS pixels per UI pixel) in the house
 * face, its alpha cut hard, a dark shadow one pixel down and right, and shown with
 * `image-rendering: pixelated`. The DOM keeps a span per word so the browser still wraps lines,
 * and a MutationObserver repaints whatever text the screens change. The body face is Tinos, a
 * Times-metric serif with lining figures and a true italic, at its own regular weight: MM6's
 * font was not fat (owner), its edge came from the hard shadow; headings are Pirata One, and
 * the quest log is Arimo, Tinos's sans sibling, as MM6 set its quest text in a sans.
 */

/**
 * CSS pixels per UI pixel: one, the view's own pitch (src/render/resolution.ts), so the shell
 * and the world share a pixel as MM6's did, 430 rows against MM6's 480 (owner, 2026-10-18:
 * "the whole UI is too pixelated" at one and a half).
 */
export const PX = 1;

// MM6's shadow is black, a pixel down and right (critics, round 6).
const SHADOW = [0, 0, 0];
const EXCLUDE = 'input, textarea, select, canvas, script, style, svg, [data-native]';

interface Face {
  family: string;
  /** Virtual pixels. */
  size: number;
  weight: number;
  italic: boolean;
  fill: [number, number, number];
  shadow: [number, number, number] | null;
  /** Dark ink cut into brass: a pale line under each stroke instead of a dark one beside it. */
  engrave: boolean;
  /** The glyphs' width over Tinos's: MM6's stone-screen italic is wider at a like height. */
  stretch: number;
  /** UI pixels between letters, from the element's letter-spacing. */
  tracking: number;
  /** The element's line box in UI pixels, and the baseline's row in it. */
  line: number;
  base: number;
}

const cache = new Map<string, HTMLCanvasElement>();
let ready = false;
let measurer: CanvasRenderingContext2D | null = null;

function measure(): CanvasRenderingContext2D {
  measurer ??= document.createElement('canvas').getContext('2d')!;
  return measurer;
}

function parseColor(css: string): [number, number, number] {
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(css);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [240, 224, 176];
}

/** The face a text node is drawn in, from its parent's computed style. */
function faceOf(el: Element): Face {
  const cs = getComputedStyle(el);
  const family = cs.fontFamily.includes('Pirata')
    ? 'Pirata One'
    : cs.fontFamily.includes('Arimo')
      ? 'Arimo'
      : 'Tinos';
  const cssSize = parseFloat(cs.fontSize) || 16;
  // The CSS size is in CSS pixels; the glyphs are drawn in UI pixels, never under eighteen
  // (twenty-seven for Pirata One), the smallest the phone keeps legible.
  const size = Math.max(family === 'Pirata One' ? 27 : 18, Math.round(cssSize / PX));
  const fill = parseColor(cs.color);
  const lum = (0.299 * fill[0] + 0.587 * fill[1] + 0.114 * fill[2]) / 255;
  const italic = family !== 'Pirata One' && cs.fontStyle === 'italic';
  const engrave = cs.getPropertyValue('--engrave').trim() === '1';
  const face: Face = {
    family,
    size,
    weight: family === 'Pirata One' ? 0.25 : 0,
    italic,
    fill,
    // Dark ink (on gold) casts no shadow, unless engraved; pale ink casts a dark one, as
    // MM6's did.
    shadow: engrave ? [250, 238, 196] : lum < 0.45 ? null : [SHADOW[0]!, SHADOW[1]!, SHADOW[2]!],
    engrave,
    stretch: parseFloat(cs.getPropertyValue('--pxt-stretch')) || 1,
    tracking: Math.max(0, Math.round((parseFloat(cs.letterSpacing) || 0) / PX)),
    line: 0,
    base: 0,
  };
  // The word's canvas is the line box itself, its baseline where the browser puts the
  // line's, so a line's pitch is the CSS line height whatever the glyphs (screens critic,
  // round 13: canvases taller than the line spread the sheet's lines to 19.5 pixels).
  const m = measure();
  m.font = cssFont(face);
  const met = m.measureText('Hg');
  const asc = met.fontBoundingBoxAscent || met.actualBoundingBoxAscent + 2;
  const desc = met.fontBoundingBoxDescent || 3;
  const lh = parseFloat(cs.lineHeight);
  face.line = Number.isFinite(lh) ? Math.max(1, Math.round(lh / PX)) : Math.ceil(asc + desc);
  face.base = Math.round((face.line - asc - desc) / 2 + asc);
  return face;
}

function key(word: string, f: Face): string {
  return `${f.family}|${f.size}|${f.italic ? 'i' : 'r'}|${f.weight}|${f.fill.join(',')}|${f.shadow ? (f.engrave ? 'e' : 's') : '-'}|${f.stretch}|${f.tracking}|${f.line}|${f.base}|${word}`;
}

function cssFont(f: Face): string {
  return `${f.italic ? 'italic ' : ''}${f.size}px "${f.family}"`;
}

/** The word set on a context whose transform puts its origin at the baseline. */
function setWord(g: CanvasRenderingContext2D, word: string, f: Face): void {
  if (!f.tracking) {
    g.fillText(word, 0, 0);
    return;
  }
  let x = 0;
  for (const ch of word) {
    g.fillText(ch, x, 0);
    x += g.measureText(ch).width + f.tracking / f.stretch;
  }
}

/** The word's width in UI pixels as `setWord` sets it. */
function wordWidth(word: string, f: Face): number {
  const m = measure();
  m.font = cssFont(f);
  if (!f.tracking) return m.measureText(word).width * f.stretch;
  let x = 0;
  for (const ch of word) x += m.measureText(ch).width * f.stretch + f.tracking;
  return x - f.tracking;
}

/**
 * Zhang and Suen's thinning: a binary picture worn down to a one-pixel skeleton that keeps
 * every stroke joined.
 */
function thin(b: Uint8Array, w: number, h: number): void {
  const gone: number[] = [];
  for (let changed = true; changed;) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      gone.length = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!b[i]) continue;
          const p2 = b[i - w]!;
          const p3 = b[i - w + 1]!;
          const p4 = b[i + 1]!;
          const p5 = b[i + w + 1]!;
          const p6 = b[i + w]!;
          const p7 = b[i + w - 1]!;
          const p8 = b[i - 1]!;
          const p9 = b[i - w - 1]!;
          const n = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (n < 2 || n > 6) continue;
          const turns =
            Number(!p2 && p3) +
            Number(!p3 && p4) +
            Number(!p4 && p5) +
            Number(!p5 && p6) +
            Number(!p6 && p7) +
            Number(!p7 && p8) +
            Number(!p8 && p9) +
            Number(!p9 && p2);
          if (turns !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          gone.push(i);
        }
      }
      for (const i of gone) b[i] = 0;
      if (gone.length) changed = true;
    }
  }
}

/**
 * Which pixels of a word's canvas are ink. Tinos and Arimo are set at four times the size,
 * cut at half cover, thinned to a skeleton and pooled four to one, ink where two of the
 * skeleton's pixels fall: MM6's type is monoline (screens critic, round 13: two thirds or
 * more of its runs one pixel, every hairline kept, where a cut at the UI size left two-pixel
 * stems and dropped the hairlines of o, r, n, t and g). Pirata One keeps its weight, cut at
 * the UI size.
 */
function inkOf(word: string, f: Face, w: number, h: number): Uint8Array {
  const ink = new Uint8Array(w * h);
  const monoline = f.family !== 'Pirata One';
  const s = monoline ? 4 : 1;
  const t = document.createElement('canvas');
  t.width = w * s;
  t.height = h * s;
  const tg = t.getContext('2d');
  if (!tg) return ink;
  tg.setTransform(s * f.stretch, 0, 0, s, s, s * f.base);
  tg.font = cssFont(f);
  tg.fillStyle = '#000';
  tg.strokeStyle = '#000';
  tg.lineWidth = f.weight;
  tg.lineJoin = 'round';
  if (f.weight > 0) tg.strokeText(word, 0, 0);
  setWord(tg, word, f);
  const d = tg.getImageData(0, 0, t.width, t.height).data;
  if (!monoline) {
    for (let i = 0; i < ink.length; i++) ink[i] = d[i * 4 + 3]! >= 100 ? 1 : 0;
    return ink;
  }
  const W = t.width;
  const H = t.height;
  const b = new Uint8Array(W * H);
  for (let i = 0; i < b.length; i++) b[i] = d[i * 4 + 3]! >= 128 ? 1 : 0;
  const cut = b.slice();
  thin(b, W, H);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = 0; dy < s; dy++)
        for (let dx = 0; dx < s; dx++) n += b[(y * s + dy) * W + x * s + dx]!;
      ink[y * w + x] = n >= 2 ? 1 : 0;
    }
  }
  // Every mark keeps a pixel: a stop or the dot of an i can thin to nothing (screens critic,
  // round 14: Zhang and Suen wear a 2x2 blob away whole), so the marks are found in the cut
  // before thinning, and one with no ink gets its fullest block.
  const seen = new Uint8Array(W * H);
  for (let start = 0; start < cut.length; start++) {
    if (!cut[start] || seen[start]) continue;
    const blocks = new Map<number, number>();
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const k = Math.floor(Math.floor(i / W) / s) * w + Math.floor((i % W) / s);
      blocks.set(k, (blocks.get(k) ?? 0) + 1);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const j = i + dy * W + dx;
          if (j >= 0 && j < cut.length && cut[j] && !seen[j] && Math.abs((j % W) - (i % W)) <= 1) {
            seen[j] = 1;
            stack.push(j);
          }
        }
    }
    if ([...blocks.keys()].some((k) => ink[k])) continue;
    let best = -1;
    let most = 0;
    for (const [k, n] of blocks)
      if (n > most) {
        most = n;
        best = k;
      }
    if (best >= 0) ink[best] = 1;
  }
  return ink;
}

/** Paint one word in a face; cached by word and face. */
function paintWord(word: string, f: Face): HTMLCanvasElement {
  const k = key(word, f);
  const hit = cache.get(k);
  if (hit) return hit;
  const m = measure();
  m.font = cssFont(f);
  const below = Math.ceil(m.measureText(word).actualBoundingBoxDescent || 0);
  // A pixel of margin left and right (the shadow's); whole pixels, so the next word starts on
  // the grid (screens critic, round 13).
  const w = Math.ceil(wordWidth(word, f)) + 2;
  const h = Math.max(f.line, f.base + below + 2);
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext('2d');
  if (g) {
    const ink = inkOf(word, f, w, h);
    const img = g.createImageData(w, h);
    const d = img.data;
    const put = (x: number, y: number, [r, gr, b]: [number, number, number]): void => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = gr;
      d[i + 2] = b;
      d[i + 3] = 255;
    };
    const ox = f.engrave ? 0 : 1;
    if (f.shadow)
      for (let i = 0; i < ink.length; i++)
        if (ink[i]) put((i % w) + ox, Math.floor(i / w) + 1, f.shadow);
    for (let i = 0; i < ink.length; i++) if (ink[i]) put(i % w, Math.floor(i / w), f.fill);
    g.putImageData(img, 0, 0);
  }
  if (cache.size > 3000) cache.clear();
  cache.set(k, c);
  return c;
}

/** Replace a text node with a span of word canvases the browser can still wrap. */
function convert(node: Text): void {
  const parent = node.parentElement;
  if (!parent || parent.closest(EXCLUDE) || parent.closest('.pxt')) return;
  const text = node.data;
  if (!text.trim()) return;
  const f = faceOf(parent);
  const span = document.createElement('span');
  span.className = 'pxt';
  // The words themselves stay in the tree, visually hidden, for readers and tests.
  const source = document.createElement('span');
  source.className = 'pxs';
  source.textContent = text;
  span.appendChild(source);
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      span.appendChild(document.createTextNode(' '));
      continue;
    }
    const canvas = paintWord(part, f);
    const img = document.createElement('canvas');
    img.width = canvas.width;
    img.height = canvas.height;
    img.getContext('2d')?.drawImage(canvas, 0, 0);
    img.className = 'pxw';
    img.style.width = `${canvas.width * PX}px`;
    img.style.height = `${canvas.height * PX}px`;
    // A descender below the line box hangs into the leading under it, as MM6's do, without
    // opening the line.
    if (canvas.height > f.line) img.style.marginBottom = `${-(canvas.height - f.line) * PX}px`;
    span.appendChild(img);
  }
  node.replaceWith(span);
  requestAnimationFrame(() => snapRun(span));
}

/**
 * A run whose first word lands off the grid (a centred line of an odd width lands half a
 * pixel off) moved back onto it (screens critic, round 16: Chrome draws a box on whole CSS
 * pixels, so a word half a pixel off shifted a device pixel). A transform does not move an
 * inline span; a relative offset does.
 */
function snapRun(span: HTMLElement): void {
  if (!span.isConnected) return;
  span.style.left = '';
  const first = span.querySelector('.pxw');
  if (!first) return;
  const x = first.getBoundingClientRect().left;
  const off = ((x % PX) + PX) % PX;
  if (off < 0.25 || off > PX - 0.25) return;
  span.style.position = 'relative';
  span.style.left = `${-off}px`;
}

function convertUnder(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    convert(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (el.matches(EXCLUDE) || el.classList.contains('pxt')) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) texts.push(n as Text);
  for (const t of texts) convert(t);
}

/**
 * Paint every run of text under `root` as bitmap text and keep doing so as the screens change
 * it. Text stays native until the house faces have loaded.
 */
export function installPixelText(root: HTMLElement): void {
  const start = (): void => {
    ready = true;
    convertUnder(root);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') convert(r.target as Text);
        for (const n of r.addedNodes) convertUnder(n);
      }
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', () =>
      requestAnimationFrame(() => root.querySelectorAll<HTMLElement>('.pxt').forEach(snapRun)),
    );
  };
  if (ready) {
    convertUnder(root);
    return;
  }
  void Promise.all([
    document.fonts.load('13px "Tinos"'),
    document.fonts.load('italic 13px "Tinos"'),
    document.fonts.load('13px "Arimo"'),
    document.fonts.load('16px "Pirata One"'),
  ])
    .then(() => document.fonts.ready)
    .then(start, start);
}
