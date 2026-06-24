import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.dev.vars', 'utf8');
const lines = envContent.split('\n');

for (const line of lines) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  
  const splitIndex = line.indexOf('=');
  const key = line.substring(0, splitIndex).trim();
  const value = line.substring(splitIndex + 1).trim();

  // Skip ALLOWED_ORIGINS because it's in wrangler.jsonc vars now
  if (key === 'ALLOWED_ORIGINS') continue;

  console.log(`Setting secret for ${key}...`);
  try {
    execSync(`npx wrangler secret put ${key}`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`Successfully set ${key}`);
  } catch (error) {
    console.error(`Failed to set ${key}`);
  }
}
