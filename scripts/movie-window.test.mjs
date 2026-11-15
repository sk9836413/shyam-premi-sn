// story/movie.py fit_window / window_wait: the movie job's Kaggle slot and its retry after a blocked window
// (15 Nov 2026: every reliable trigger fell inside 09:00-11:30 / 18:30-21:00 IST, so part 1 was never made).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const PY = process.env.PYTHON || 'python';
const probe = spawnSync(PY, ['--version']);

function run(cases) {
  const code = `
import importlib.util, datetime, json, sys
s = importlib.util.spec_from_file_location("movie", "story/movie.py"); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
out = []
for ist, tier, queue in json.loads(sys.argv[1]):
    h, mi = map(int, ist.split(":"))
    now = datetime.datetime(2026, 11, 15, h, mi, tzinfo=datetime.timezone.utc) - datetime.timedelta(hours=5, minutes=30)
    out.append([m.fit_window(tier, now, queue), m.window_wait(now)])
print(json.dumps(out))`;
  const r = spawnSync(PY, ['-c', code, JSON.stringify(cases)], { encoding: 'utf8', env: { ...process.env, MOVIE_WINDOWS: '09:00-11:30,18:30-21:00' } });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('movie Kaggle windows: scheduler dispatches wait, the retry lands after the window', { skip: probe.status !== 0 && 'no python' }, () => {
  const [d1843, d1846, d1043, d2102, d1735, d1132, d0600] = run([
    ['18:43', 'full', 30], ['18:46', 'full', 30], ['10:43', 'full', 30], ['21:02', 'full', 120],
    ['17:35', 'full', 120], ['11:32', 'full', 120], ['06:00', 'full', 30]]);
  assert.deepEqual(d1846, ['wait', 134]);            // 18:46 dispatch -> retry at 21:00 (+2 in cmd_tier)
  assert.equal(d1843[0], 'wait');
  assert.deepEqual(d1043, ['wait', 47]);             // 10:43 dispatch -> retry at 11:30
  assert.equal(d2102[0], 'full');                    // after the evening window: a full session fits before 09:00
  assert.deepEqual(d1735, ['wait', 205]);            // too close to 18:30 for any tier: wait until 21:00
  assert.equal(d1132[0], 'full');                    // 11:32 + 165 + 60 (half the queue) < 18:30
  assert.equal(d0600[0], 'full');                    // 06:00: 180 min to 09:00 = 165 + 15 (half the 30-min queue)
});
