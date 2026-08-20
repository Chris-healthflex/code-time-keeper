import fs from 'fs';
import path from 'path';

function checkEnv(filePath: string) {
  console.log("Checking:", filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key.includes('PROJECT_ID') || key.includes('URL')) {
          console.log(`  ${key} = ${val}`);
        }
      }
    }
  } catch (e) {
    console.error("  Error reading file:", e);
  }
}

checkEnv(path.resolve(process.cwd(), '.env'));
checkEnv(path.resolve(process.cwd(), '../.env'));
