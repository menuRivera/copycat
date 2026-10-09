import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['flows', 'docs'];
const blockPattern = /```mermaid\n([\s\S]*?)```/g;

function markdownFiles(dir) {
  return readdirSync(path.join(root, dir))
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(root, dir, file));
}

const temp = mkdtempSync(path.join(tmpdir(), 'copycat-mermaid-'));
const puppeteerConfig = path.join(temp, 'puppeteer.json');
writeFileSync(puppeteerConfig, JSON.stringify({ args: ['--no-sandbox'] }));

let count = 0;
try {
  for (const dir of dirs) {
    for (const file of markdownFiles(dir)) {
      const text = readFileSync(file, 'utf8');
      const blocks = [...text.matchAll(blockPattern)];
      blocks.forEach((match, index) => {
        count += 1;
        const name = `${path.basename(file, '.md')}-${index + 1}`;
        const input = path.join(temp, `${name}.mmd`);
        const output = path.join(temp, `${name}.svg`);
        writeFileSync(input, match[1] ?? '');
        execFileSync(
          'npx',
          ['-y', '@mermaid-js/mermaid-cli', '-p', puppeteerConfig, '-i', input, '-o', output],
          { stdio: 'inherit' },
        );
        console.log(`ok ${path.relative(root, file)} block ${index + 1}`);
      });
    }
  }
  console.log(`validated ${count} mermaid blocks`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
