/**
 * Secret detection shared by the pre-commit hook and CI.
 *
 * The rules are deliberately specific to what this project handles (Meshy, Freesound,
 * GitHub, generic cloud keys) plus a high-entropy check for assignments that look like
 * credentials. A hit prints a redacted preview, never the value.
 */
export interface SecretRule {
  id: string;
  regex: RegExp;
}

export interface SecretHit {
  file: string;
  line: number;
  rule: string;
  /** Redacted preview of the matched text. */
  preview: string;
}

export const RULES: readonly SecretRule[] = [
  { id: 'meshy-api-key', regex: /msy_[A-Za-z0-9]{20,}/g },
  { id: 'openai-style-key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'anthropic-key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'github-token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { id: 'github-fine-grained', regex: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
  { id: 'aws-access-key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    id: 'private-key-block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'freesound-key-assignment',
    regex: /freesound[_-]?(?:api[_-]?)?(?:key|token)\s*[:=]\s*['"]?[A-Za-z0-9]{24,}/gi,
  },
  {
    id: 'generic-key-assignment',
    // KEY=..., api_key: "...", secret = '...' with a long token-like value
    regex:
      /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|password)\b\s*[:=]\s*['"]?([A-Za-z0-9_\-/+=]{24,})['"]?/gi,
  },
];

/** Placeholder-looking values that are fine in docs and examples. */
const SAFE_VALUE =
  /^(?:[xX]+|[0]+|\.{3,}|<[^>]+>|\$\{[^}]+\}|your[_-]?.*|example.*|changeme.*|placeholder.*|redacted.*)$/i;

export function shannonEntropy(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function redact(s: string): string {
  if (s.length <= 8) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`;
}

export function scanText(file: string, text: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, i) => {
    if (/\bsecrets-guard:allow\b/.test(lineText)) return;
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rule.regex.exec(lineText)) !== null) {
        const value = m[1] ?? m[0];
        if (rule.id === 'generic-key-assignment') {
          // Only flag values that look random; skip obvious placeholders and words.
          if (SAFE_VALUE.test(value) || shannonEntropy(value) < 3.5) continue;
        }
        hits.push({ file, line: i + 1, rule: rule.id, preview: redact(value) });
      }
    }
  });
  return hits;
}

/** Files we never scan: binaries, lockfiles, and our own rule definitions. */
export function isScannable(path: string): boolean {
  if (
    /\.(png|jpe?g|gif|webp|avif|ico|glb|gltf|bin|wasm|woff2?|ttf|otf|mp3|ogg|wav|m4a|aac|mp4|zip|pdf|psd|fig)$/i.test(
      path,
    )
  ) {
    return false;
  }
  if (/(^|\/)package-lock\.json$/.test(path)) return false;
  if (/^tools\/lib\/secrets\.ts$|^tools\/lib\/secrets\.test\.ts$|^\.gitleaks\.toml$/.test(path))
    return false;
  return true;
}
