// Build gate: every audio file in music/library/ needs a valid <id>.licence.json (music/engine.mjs validateLicence:
// allowed licence, source URLs, date checked, attribution field, sha256 of the file). Exit 1 on any problem.
//   node music/check-licences.mjs [--dir <library dir>]
import path from 'node:path';
import { checkLibrary, LIBRARY } from './engine.mjs';

const args = process.argv.slice(2);
const dir = args.includes('--dir') ? path.resolve(args[args.indexOf('--dir') + 1]) : LIBRARY;
const r = checkLibrary(dir);
console.log(JSON.stringify({ ok: r.ok, tracks: r.tracks, errors: r.errors }, null, 1));
process.exit(r.ok ? 0 : 1);
