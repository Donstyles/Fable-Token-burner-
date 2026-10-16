/**
 * The character creation screen (Phase 5 step 10): four drafts as tabs; for each a name,
 * sex, class and a text-initial portrait, the seven statistics with − and + over the pool,
 * the class's fixed skills and two picks. Rules errors show inline once Begin has been
 * pressed; Begin hands the four characters to the caller.
 */
import './ui.css';
import './screens.css';
import type { Character } from '../game/character';
import { type CreationInput, pointsLeft } from '../game/creation';
import { button, el, heading, kv, note, tabRow } from './dom';
import {
  adjustStat,
  buildParty,
  CLASS_OPTIONS,
  draftErrors,
  initial,
  newDraft,
  setClass,
  setName,
  setSex,
  skillChips,
  statControls,
  togglePick,
} from './creation-model';
import { signed } from './sheet-model';

export interface CreationScreen {
  dispose(): void;
}

export function createCreationScreen(
  uiLayer: HTMLElement,
  onDone: (characters: Character[]) => void,
): CreationScreen {
  const drafts: CreationInput[] = [newDraft(), newDraft(), newDraft(), newDraft()];
  let active = 0;
  let showErrors = false;
  let partyErrors: string[] = [];

  const root = el('div', 'cre-root');
  const panel = el('div', 'ui-panel');
  const head = el('div', 'ui-head');
  const tabs = el('div', 'ui-head-tabs');
  const begin = button('Begin', () => tryBegin(), { className: 'primary' });
  head.append(el('h1', 'ui-title', 'New Party'), tabs, begin);
  const body = el('div', 'ui-body');
  const foot = el('div', 'ui-foot');
  panel.append(head, body, foot);
  root.appendChild(panel);
  uiLayer.appendChild(root);

  const update = (i: number, d: CreationInput): void => {
    drafts[i] = d;
    draw();
  };

  const tryBegin = (): void => {
    const r = buildParty(drafts);
    if (r.ok) {
      onDone(r.characters);
      return;
    }
    showErrors = true;
    partyErrors = r.party;
    const first = r.errors.findIndex((e) => e.length > 0);
    if (first >= 0 && r.errors[active]?.length === 0) active = first;
    draw();
  };

  const identityColumn = (i: number, d: CreationInput): HTMLElement => {
    const col = el('div', 'ui-col narrow');
    const row = el('div', 'cre-identity');
    const portrait = el('div', 'cre-portrait', initial(d.name));
    const name = el('input', 'cre-name');
    name.type = 'text';
    name.maxLength = 15;
    name.placeholder = 'Name';
    name.value = d.name;
    name.autocomplete = 'off';
    name.addEventListener('input', () => {
      drafts[i] = setName(drafts[i]!, name.value);
      portrait.textContent = initial(name.value);
      const tab = tabs.querySelectorAll('.ui-tab')[i];
      if (tab)
        tab.querySelector('.ui-btn-label')!.textContent = name.value.trim() || `Member ${i + 1}`;
    });
    row.append(portrait, name);
    col.appendChild(row);
    col.appendChild(heading('Sex'));
    col.appendChild(
      tabRow(
        [
          { id: 'male', label: 'Male' },
          { id: 'female', label: 'Female' },
        ] as const,
        d.sex,
        (sex) => update(i, setSex(drafts[i]!, sex)),
      ),
    );
    col.appendChild(heading('Class'));
    const classes = el('div', 'cre-chips');
    for (const c of CLASS_OPTIONS) {
      const b = button(c.name, () => update(i, setClass(drafts[i]!, c.id)), {
        className: 'ui-tab cre-chip',
      });
      if (c.id === d.classId) b.classList.add('active');
      classes.appendChild(b);
    }
    col.appendChild(classes);
    return col;
  };

  const statsColumn = (i: number, d: CreationInput): HTMLElement => {
    const col = el('div', 'ui-col narrow');
    col.appendChild(kv('Points left', pointsLeft(d.classId, d.stats), 'cre-points'));
    col.appendChild(heading('Statistics'));
    for (const c of statControls(d)) {
      const row = el('div', 'cre-stat');
      const label = el('span', 'ui-k', c.label);
      const minus = button('−', () => update(i, adjustStat(drafts[i]!, c.stat, -1)), {
        disabled: !c.canLower,
      });
      const value = el('span', 'ui-v', `${c.value} ${signed(c.bonus)}`);
      value.style.textAlign = 'center';
      const plus = button('+', () => update(i, adjustStat(drafts[i]!, c.stat, 1)), {
        disabled: !c.canRaise,
      });
      row.append(label, minus, value, plus);
      col.appendChild(row);
    }
    return col;
  };

  const skillsColumn = (i: number, d: CreationInput): HTMLElement => {
    const col = el('div', 'ui-col');
    col.appendChild(heading('Skills: two from the class, pick two more'));
    const chips = el('div', 'cre-chips');
    for (const chip of skillChips(d)) {
      const b = button(chip.name, () => update(i, togglePick(drafts[i]!, chip.id)), {
        className: `ui-tab cre-chip${chip.fixed ? ' fixed' : ''}`,
        disabled: chip.fixed || !chip.canPick,
      });
      if (chip.picked) b.classList.add('active');
      chips.appendChild(b);
    }
    col.appendChild(chips);
    if (showErrors) {
      const errors = draftErrors(d);
      if (errors.length) col.appendChild(heading('Before you begin'));
      for (const e of errors) col.appendChild(note(e, 'bad'));
    }
    return col;
  };

  const draw = (): void => {
    tabs.replaceChildren(
      tabRow(
        drafts.map((d, i) => ({
          id: i,
          label: d.name.trim() || `Member ${i + 1}`,
          className: showErrors && draftErrors(d).length ? 'down' : '',
        })),
        active,
        (i) => {
          active = i;
          draw();
        },
      ),
    );
    const d = drafts[active]!;
    body.replaceChildren(
      identityColumn(active, d),
      statsColumn(active, d),
      skillsColumn(active, d),
    );
    foot.textContent = partyErrors.join(' ');
    foot.classList.toggle('shown', partyErrors.length > 0);
  };

  draw();
  return {
    dispose() {
      root.remove();
    },
  };
}
