/**
 * The quest log and automap screens (Phase 5 step 10): the log as two lists, active and
 * done, each entry with its text and current objective; the map as a canvas of the current
 * level's visited cells with the party's cell and heading drawn on it.
 */
import type { ScreenContext } from './context';
import { el, heading, note } from './dom';
import { type MapView, mapView, type QuestRow, questRows } from './journal-model';

function questList(title: string, rows: QuestRow[], empty: string): HTMLElement {
  const col = el('div', 'ui-col scroll');
  col.appendChild(heading(title));
  if (rows.length === 0) col.appendChild(note(empty));
  for (const q of rows) {
    const row = el('div', 'ui-row');
    if (q.done) row.classList.add('dim');
    const text = el('div', 'grow');
    text.appendChild(el('div', '', q.title));
    if (q.text) text.appendChild(el('div', 'sub', q.text));
    if (q.objective) text.appendChild(el('div', 'quest-objective', q.objective));
    row.appendChild(text);
    col.appendChild(row);
  }
  return col;
}

export function renderQuests(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  const rows = questRows(state.quests, hooks.questDefs ?? {});
  frame.body.replaceChildren(
    questList('Active', rows.active, 'No quests yet.'),
    questList('Completed', rows.done, 'Nothing completed yet.'),
  );
}

const MAP_WIDTH = 720;
const MAP_HEIGHT = 300;
const DEG = Math.PI / 180;

function drawMap(canvas: HTMLCanvasElement, v: MapView): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { scale, offsetX, offsetY } = v.transform;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#5a4a2a';
  for (const [cx, cy] of v.cells) {
    g.fillRect(
      offsetX + cx * scale,
      offsetY + cy * scale,
      Math.max(1, scale - 1),
      Math.max(1, scale - 1),
    );
  }
  if (!v.party) return;
  const px = offsetX + (v.party.cx + 0.5) * scale;
  const py = offsetY + (v.party.cy + 0.5) * scale;
  const r = Math.max(4, scale);
  // Babylon's heading: forward is (sin yaw, cos yaw) on the ground, z down the canvas.
  const dx = Math.sin(v.party.yawDeg * DEG);
  const dy = Math.cos(v.party.yawDeg * DEG);
  g.fillStyle = '#f0c050';
  g.beginPath();
  g.moveTo(px + dx * r, py + dy * r);
  g.lineTo(px - dy * r * 0.6 - dx * r * 0.6, py + dx * r * 0.6 - dy * r * 0.6);
  g.lineTo(px + dy * r * 0.6 - dx * r * 0.6, py - dx * r * 0.6 - dy * r * 0.6);
  g.closePath();
  g.fill();
}

export function renderMap(ctx: ScreenContext): void {
  const { state, frame } = ctx;
  const col = el('div', 'ui-col');
  const v = mapView(state, MAP_WIDTH, MAP_HEIGHT);
  if (!v) {
    col.appendChild(note('No map of this place yet.'));
    frame.body.replaceChildren(col);
    return;
  }
  const canvas = el('canvas', 'map-canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  canvas.style.width = `${MAP_WIDTH}px`;
  canvas.style.height = `${MAP_HEIGHT}px`;
  canvas.style.maxWidth = '100%';
  drawMap(canvas, v);
  col.append(canvas, note(`${v.levelId}: ${v.visited} of ${v.total} cells walked.`));
  frame.body.replaceChildren(col);
}
