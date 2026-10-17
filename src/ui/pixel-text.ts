/**
 * Bitmap text (DESIGN.md 16.10). MM6's type was pixels with hard edges; a phone draws smooth,
 * anti-aliased type, which the owner reads as modern. So every run of text in the UI layer is
 * painted onto a canvas on the game's pixel grid (`PX` CSS pixels per UI pixel) in the house
 * face, its alpha cut hard, a dark shadow one pixel down and right, and shown with
 * `image-rendering: pixelated`. The DOM keeps a span per word so the browser still wraps lines,
 * and a MutationObserver repaints whatever text the screens change. The body face is Tinos, a
 * Times-metric serif with lining figures and a true italic, at its own regular weight: MM6's
 * font was not fat (owner), its edge came from the hard shadow; headings are Pirata One.
 */

/** CSS pixels per UI pixel: 932 CSS px across becomes 621 columns, MM6's 640. */
export const PX = 1.5;

const SHADOW = [26, 16, 8];
const EXCLUDE = 'input, textarea, select, canvas, script, style, svg, [data-native]';

interface Face {
  family: string;
  /** Virtual pixels. */
  size: number;
  weight: number;
  italic: boolean;
  fill: [number, number, number];
  shadow: [number, number, number] | null;
}

const cache = new Map<string, HTMLCanvasElement>();
let ready = false;

function parseColor(css: string): [number, number, number] {
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(css);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [240, 224, 176];
}

/** The face a text node is drawn in, from its parent's computed style. */
function faceOf(el: Element): Face {
  const cs = getComputedStyle(el);
  const family = cs.fontFamily.includes('Pirata') ? 'Pirata One' : 'Tinos';
  const cssSize = parseFloat(cs.fontSize) || 16;
  // The CSS size is in CSS pixels; the glyphs are drawn in UI pixels, never under 11.
  const size = Math.max(family === 'Pirata One' ? 18 : 12, Math.round(cssSize / PX));
  const fill = parseColor(cs.color);
  const lum = (0.299 * fill[0] + 0.587 * fill[1] + 0.114 * fill[2]) / 255;
  const italic = family !== 'Pirata One' && cs.fontStyle === 'italic';
  return {
    family,
    size,
    weight: family === 'Pirata One' ? 0.25 : 0.15,
    italic,
    fill,
    // Dark ink (on gold) casts no shadow; pale ink casts a dark one, as MM6's did.
    shadow: lum < 0.45 ? null : [SHADOW[0]!, SHADOW[1]!, SHADOW[2]!],
  };
}

function key(word: string, f: Face): string {
  return `${f.family}|${f.size}|${f.italic ? 'i' : 'r'}|${f.weight}|${f.fill.join(',')}|${f.shadow ? 's' : '-'}|${word}`;
}

function cssFont(f: Face): string {
  return `${f.italic ? 'italic ' : ''}${f.size}px "${f.family}"`;
}

function stamp(
  g: CanvasRenderingContext2D,
  word: string,
  f: Face,
  w: number,
  h: number,
  asc: number,
  color: [number, number, number],
  ox: number,
  oy: number,
): void {
  const t = document.createElement('canvas');
  t.width = w;
  t.height = h;
  const tg = t.getContext('2d');
  if (!tg) return;
  tg.font = cssFont(f);
  tg.fillStyle = '#000';
  tg.strokeStyle = '#000';
  tg.lineWidth = f.weight;
  tg.lineJoin = 'round';
  if (f.weight > 0) tg.strokeText(word, 1 + ox, asc + oy);
  tg.fillText(word, 1 + ox, asc + oy);
  const id = tg.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! >= 90) {
      d[i] = color[0];
      d[i + 1] = color[1];
      d[i + 2] = color[2];
      d[i + 3] = 255;
    } else d[i + 3] = 0;
  }
  tg.putImageData(id, 0, 0);
  g.drawImage(t, 0, 0);
}

/** Paint one word in a face; cached by word and face. */
function paintWord(word: string, f: Face): { canvas: HTMLCanvasElement; descent: number } {
  const k = key(word, f);
  const hit = cache.get(k);
  const m = document.createElement('canvas').getContext('2d')!;
  m.font = cssFont(f);
  const met = m.measureText(word);
  const asc = Math.ceil(met.fontBoundingBoxAscent || met.actualBoundingBoxAscent + 2);
  const desc = Math.ceil(met.fontBoundingBoxDescent || 3);
  if (hit) return { canvas: hit, descent: desc };
  const w = Math.ceil(met.width) + 2;
  const h = asc + desc + 2;
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext('2d');
  if (g) {
    if (f.shadow) stamp(g, word, f, w, h, asc, f.shadow, 1, 1);
    stamp(g, word, f, w, h, asc, f.fill, 0, 0);
  }
  if (cache.size > 3000) cache.clear();
  cache.set(k, c);
  return { canvas: c, descent: desc };
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
    const { canvas, descent } = paintWord(part, f);
    const img = document.createElement('canvas');
    img.width = canvas.width;
    img.height = canvas.height;
    img.getContext('2d')?.drawImage(canvas, 0, 0);
    img.className = 'pxw';
    img.style.width = `${canvas.width * PX}px`;
    img.style.height = `${canvas.height * PX}px`;
    img.style.verticalAlign = `${-(descent + 1) * PX}px`;
    span.appendChild(img);
  }
  node.replaceWith(span);
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
  };
  if (ready) {
    convertUnder(root);
    return;
  }
  void Promise.all([
    document.fonts.load('13px "Tinos"'),
    document.fonts.load('italic 13px "Tinos"'),
    document.fonts.load('16px "Pirata One"'),
  ])
    .then(() => document.fonts.ready)
    .then(start, start);
}
