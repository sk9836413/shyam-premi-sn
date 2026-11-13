// node --test scripts/bhakti-seo.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bhaktiPhrase, bhaktiTags, bhaktiTitle, hasSearchedPhrase, isBhajanVideo, otherChannelTerm, thirdPartyNames, withTags } from './bhakti-seo.mjs';

test('other channels\' names are found in any text, generic phrases are not', () => {
  assert.deepEqual(thirdPartyNames('Khatu Shyam Bhajan | Shyam Sangeet Studio'), ['shyam sangeet studio']);
  assert.deepEqual(thirdPartyNames('ganesh youth association, chhath geet'), ['ganesh youth association']);
  assert.deepEqual(thirdPartyNames('Shyam Sangeet | Bhakti Geet | Sawariya Sarkar ka darshan'), []);
  assert.ok(otherChannelTerm('ganpati official') && otherChannelTerm('shri balaji film city') && otherChannelTerm('xyz studio'));
  assert.ok(!otherChannelTerm('bhakti geete channel') && !otherChannelTerm('shyam baba song') && !otherChannelTerm('shyam bhajan 2026'));
});

test('bhajan titles get one searched phrase, before the Devanagari part, within the limit', () => {
  const t = bhaktiTitle('Kharna Geet 2026 | Chhath Puja Song | खरना छठ गीत #Shorts', { date: '2026-11-14', festival: 'chhath', slot: 'morning' });
  assert.equal(t, 'Kharna Geet 2026 | Chhath Puja Song | Bhakti Geet | खरना छठ गीत #Shorts');
  assert.equal(bhaktiTitle(t, { festival: 'chhath' }), t, 'never twice');
  assert.equal(bhaktiTitle('Chhath Puja Geet 2026 Nonstop | 12 Chhath Geet | छठ पूजा गीत | Chhath Puja Song', { festival: 'chhath' }, 100),
    'Chhath Puja Geet 2026 Nonstop | 12 Chhath Geet | Bhakti Geet | छठ पूजा गीत | Chhath Puja Song');
  const long = `${'x'.repeat(80)} | छठ #Shorts`;
  assert.equal(bhaktiTitle(long, { festival: 'chhath' }), long, 'unchanged when it does not fit');
  assert.ok(hasSearchedPhrase('Khatu Shyam Bhajan 2026 | Shyam Baba Song #Shorts'));
});

test('Shyam songs alternate Shyam Bhajan <year> / Shyam Baba Song; mantra jaap = Krishna Mantra', () => {
  const a = bhaktiPhrase({ date: '2026-11-20', deity: 'khatu' });
  const b = bhaktiPhrase({ date: '2026-11-21', deity: 'khatu' });
  assert.notEqual(a, b);
  assert.deepEqual([a, b].sort(), ['Shyam Baba Song', 'Shyam Bhajan 2026']);
  assert.notEqual(bhaktiPhrase({ date: '2026-11-20', deity: 'khatu', slot: 'morning' }), bhaktiPhrase({ date: '2026-11-20', deity: 'khatu', slot: 'evening' }));
  assert.equal(bhaktiPhrase({ deity: 'krishna', kind: 'mantra' }), 'Krishna Mantra');
  assert.equal(bhaktiPhrase({ festival: 'chhath' }), 'Bhakti Geet');
});

test('bhajan videos and tags', () => {
  assert.ok(isBhajanVideo({ bhajan_short: true }) && isBhajanVideo({ kind: 'jukebox' }));
  assert.ok(!isBhajanVideo({ bhajan: { id: 'bhajan-x', mode: 'outro' } }) && !isBhajanVideo({ format: 'status' }));
  assert.equal(withTags('chhath geet, shyam premi sn', bhaktiTags({ festival: 'chhath' })), 'chhath geet, bhakti geet, भक्ति गीत, shyam premi sn');
  assert.equal(withTags('bhakti geet, x', ['Bhakti Geet']), 'bhakti geet, x');
});
