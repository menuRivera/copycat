import { createHash } from 'node:crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function normalizeWhitespace(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}

export function domHash(html: string): string {
  return sha256Hex(normalizeWhitespace(html));
}
