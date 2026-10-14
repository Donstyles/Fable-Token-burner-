import { describe, expect, it } from 'vitest';
import { isScannable, redact, scanText, shannonEntropy } from './secrets';

// All sample values below are synthetic.
const meshy = 'msy_' + 'Ab3dEf9hIjKlMnOpQrStUvWxYz01';
const gh = 'ghp_' + 'Q7w8e9r0t1y2u3i4o5p6a7s8d9f0g1h2j3k4l5z6';

describe('scanText', () => {
  it('finds a Meshy key anywhere in a line', () => {
    const hits = scanText('tools/meshy.ts', `const k = "${meshy}";`);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.rule).toBe('meshy-api-key');
    expect(hits[0]?.line).toBe(1);
    expect(hits[0]?.preview).not.toContain(meshy);
  });

  it('finds GitHub tokens and private key blocks', () => {
    const text = `token=${gh}\n-----BEGIN RSA PRIVATE KEY-----\n`;
    const rules = scanText('x', text).map((h) => h.rule);
    expect(rules).toContain('github-token');
    expect(rules).toContain('private-key-block');
  });

  it('flags random-looking generic key assignments but not placeholders', () => {
    expect(scanText('x', 'API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toHaveLength(0);
    expect(scanText('x', 'api_key: "<your-api-key-here-goes-xx>"')).toHaveLength(0);
    expect(scanText('x', 'api_key = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')).toHaveLength(0);
    expect(scanText('x', 'api_key = "k3J9sdF0aQpLx7Vb2NcYw8RtZe5MgH1u"')).toHaveLength(1);
  });

  it('honours an inline allow marker', () => {
    expect(scanText('x', `example: ${meshy} // secrets-guard:allow`)).toHaveLength(0);
  });

  it('reads env var names without values as safe', () => {
    expect(scanText('x', 'const key = process.env.MESHY_API_KEY;')).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('redacts without leaking the middle', () => {
    expect(redact('abcdefghijklmnop')).toBe('abcd…op (16 chars)');
    expect(redact('short')).toBe('*****');
  });
  it('computes entropy', () => {
    expect(shannonEntropy('aaaa')).toBe(0);
    expect(shannonEntropy('abcd')).toBe(2);
  });
  it('skips binaries and lockfiles', () => {
    expect(isScannable('assets/x.glb')).toBe(false);
    expect(isScannable('package-lock.json')).toBe(false);
    expect(isScannable('src/main.ts')).toBe(true);
  });
});
