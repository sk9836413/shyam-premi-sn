// One-time: stores the GitHub Actions secrets for sk9836413/shyam-premi-sn.
// Asks for the Cloudflare and Claude tokens (input hidden); copies the Make webhook and the YouTube
// credentials from %USERPROFILE%\.shyampremisk\make.env and youtube.env.
//   node E:\shyampremisk\scripts\set-secrets.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const REPO = 'sk9836413/shyam-premi-sn';
const DIR = path.join(os.homedir(), '.shyampremisk');

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : s.replace(/[^\r\n]/g, '*'));
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a.trim()); });
  });
}

const readEnv = (file) => (fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
  : {});

const secrets = {
  CF_API_TOKEN: await ask('1) Cloudflare API token (Enter to skip): '),
  CLAUDE_CODE_OAUTH_TOKEN: await ask('2) Claude Code token, from `claude setup-token` (Enter to skip): '),
  ...readEnv(path.join(DIR, 'make.env')),
  ...readEnv(path.join(DIR, 'youtube.env')),
};

for (const [k, v] of Object.entries(secrets)) {
  if (!v) continue;
  // gh gets stdin directly; through cmd.exe on Windows it was dropped and empty secrets were stored.
  const r = spawnSync('gh', ['secret', 'set', k, '--repo', REPO], { input: v, encoding: 'utf8' });
  console.log(r.status === 0 ? `${k}: set` : `${k}: FAILED ${(r.stderr || '').trim()}`);
}
console.log('Done. Tell Claude "secrets done" and close this tab.');
