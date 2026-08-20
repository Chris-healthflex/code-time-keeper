import fs from 'fs';
import path from 'path';

const dotenvPath = path.resolve(process.cwd(), '../.env');
console.log("Reading workspace root .env from:", dotenvPath);

try {
  const content = fs.readFileSync(dotenvPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      console.log(`Key found: ${key} (length: ${val.length})`);
    }
  }
} catch (e) {
  console.error("Error reading .env:", e);
}
