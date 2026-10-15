/** On-screen tuning panel for development builds. Values persist per device. */
export type Field =
  | {
      kind: 'range';
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      get: () => number;
      set: (v: number) => void;
      /** false: never restored from or written to storage (device-specific choices). */
      persist?: boolean;
    }
  | {
      kind: 'select';
      key: string;
      label: string;
      options: readonly string[];
      get: () => string;
      set: (v: string) => void;
      persist?: boolean;
    }
  | {
      kind: 'toggle';
      key: string;
      label: string;
      get: () => boolean;
      set: (v: boolean) => void;
      persist?: boolean;
    }
  | { kind: 'button'; key: string; label: string; run: () => void };

const STORAGE_KEY = 'ftb.dev.v1';

function loadStored(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function store(values: Record<string, unknown>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

export interface DevPanel {
  toast(text: string): void;
  dispose(): void;
}

export interface DevPanelOptions {
  /** Returns the diagnostics text for the copy-log button and the live view. */
  log?: () => string;
}

export function createDevPanel(
  parent: HTMLElement,
  fields: Field[],
  options: DevPanelOptions = {},
): DevPanel {
  const stored = loadStored();
  const volatile = new Set(
    fields.filter((f) => 'persist' in f && f.persist === false).map((f) => f.key),
  );
  const values: Record<string, unknown> = { ...stored };
  for (const key of volatile) delete values[key];

  // Apply persisted values first so the game starts in the tuned state.
  for (const f of fields) {
    const v = stored[f.key];
    if (v === undefined || volatile.has(f.key)) continue;
    if (f.kind === 'range' && typeof v === 'number') f.set(v);
    else if (f.kind === 'select' && typeof v === 'string' && f.options.includes(v)) f.set(v);
    else if (f.kind === 'toggle' && typeof v === 'boolean') f.set(v);
  }

  const root = document.createElement('div');
  root.className = 'dev-panel';
  const toggle = document.createElement('button');
  toggle.className = 'dev-toggle';
  toggle.type = 'button';
  toggle.textContent = 'tune';
  toggle.setAttribute('aria-label', 'Toggle tuning panel');
  const body = document.createElement('div');
  body.className = 'dev-body';
  body.hidden = true;
  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
  });
  root.append(toggle, body);

  const remember = (key: string, v: unknown): void => {
    if (!volatile.has(key)) values[key] = v;
    store(values);
  };

  /** Current value of every field, for handing back to the developer. */
  const snapshot = (): string => {
    const out: Record<string, unknown> = {};
    for (const f of fields) if (f.kind !== 'button') out[f.key] = f.get();
    return JSON.stringify(out);
  };

  // "copy values": clipboard first, the share sheet second, a selectable box last.
  const copyRow = document.createElement('div');
  copyRow.className = 'dev-row dev-copy';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'copy values';
  const fallback = document.createElement('textarea');
  fallback.className = 'dev-fallback';
  fallback.readOnly = true;
  fallback.hidden = true;
  copyBtn.addEventListener('click', async () => {
    const text = snapshot();
    try {
      await navigator.clipboard.writeText(text);
      api.toast('values copied, paste them in chat');
      return;
    } catch {
      // fall through
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Token Burner tuning', text });
        return;
      }
    } catch {
      // fall through
    }
    fallback.value = text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
  });
  copyRow.append(copyBtn, fallback);
  body.appendChild(copyRow);

  // "copy log": the on-device diagnostics, plus a live tail at the bottom of the panel.
  let logTimer = 0;
  if (options.log) {
    const getLog = options.log;
    const logRow = document.createElement('div');
    logRow.className = 'dev-row dev-copy';
    const logBtn = document.createElement('button');
    logBtn.type = 'button';
    logBtn.textContent = 'copy log';
    const logFallback = document.createElement('textarea');
    logFallback.className = 'dev-fallback';
    logFallback.readOnly = true;
    logFallback.hidden = true;
    logBtn.addEventListener('click', async () => {
      const text = getLog();
      try {
        await navigator.clipboard.writeText(text);
        api.toast('log copied, paste it in chat');
        return;
      } catch {
        // fall through
      }
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Token Burner log', text });
          return;
        }
      } catch {
        // fall through
      }
      logFallback.value = text;
      logFallback.hidden = false;
      logFallback.focus();
      logFallback.select();
    });
    logRow.append(logBtn, logFallback);
    body.appendChild(logRow);
    const tail = document.createElement('pre');
    tail.className = 'dev-log';
    body.appendChild(tail);
    logTimer = window.setInterval(() => {
      if (body.hidden) return;
      tail.textContent = getLog().split('\n').slice(-12).join('\n');
    }, 1000);
  }

  for (const f of fields) {
    const row = document.createElement('label');
    row.className = 'dev-row';
    const name = document.createElement('span');
    name.textContent = f.label;
    row.appendChild(name);
    if (f.kind === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(f.min);
      input.max = String(f.max);
      input.step = String(f.step);
      input.value = String(f.get());
      const out = document.createElement('output');
      out.textContent = String(f.get());
      input.addEventListener('input', () => {
        const v = Number(input.value);
        f.set(v);
        out.textContent = String(v);
        remember(f.key, v);
      });
      row.append(input, out);
    } else if (f.kind === 'select') {
      const select = document.createElement('select');
      for (const o of f.options) {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        select.appendChild(opt);
      }
      select.value = f.get();
      select.addEventListener('change', () => {
        f.set(select.value);
        remember(f.key, select.value);
      });
      row.appendChild(select);
    } else if (f.kind === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = f.get();
      input.addEventListener('change', () => {
        f.set(input.checked);
        remember(f.key, input.checked);
      });
      row.appendChild(input);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'run';
      btn.addEventListener('click', f.run);
      row.appendChild(btn);
    }
    body.appendChild(row);
  }

  const toastEl = document.createElement('div');
  toastEl.className = 'dev-toast';
  toastEl.hidden = true;
  parent.append(root, toastEl);
  let toastTimer = 0;

  const api: DevPanel = {
    toast(text) {
      toastEl.textContent = text;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toastEl.hidden = true;
      }, 1800);
    },
    dispose() {
      clearInterval(logTimer);
      root.remove();
      toastEl.remove();
    },
  };
  return api;
}
