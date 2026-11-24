# Shyam Premi SN - read this first

Devotional channel (YouTube, Instagram, Facebook): Shorts, festival status videos, bhajans, mantra jaap, kathas, owner
darshan footage. Everything runs in GitHub Actions in this repo. **This repo is PUBLIC**: logs, summaries and commits
are visible to anyone; never print or commit secrets or private data.

## Where things are

- Daily plan, slots, formats and timings: `automation/STORY.md` (main rules) and the header of `.github/workflows/daily.yml`.
- Comments: `automation/COMMENTS.md`. Photo posts: `automation/PHOTOS.md`. Temple series and sati-temple rules:
  `automation/mandir-series.md`. Footage/photo licences: `footage/README.txt`, `characters/REAL-FOOTAGE.md`.
  Growth notes: `automation/growth.md`. Publish log: `automation/published.md`, `automation/log.md`.
- Validators and guards (never weaken): `scripts/validate.mjs`, `scripts/upload-guard.mjs`, the bhajan/mantra QA in
  `music/` (Whisper name gate). Tests: `node --test scripts/*.test.mjs`.
- Numbers on demand (YouTube, Facebook, Instagram; this repo's own secrets, counts only):
  `gh workflow run stats-now.yml -R sk9836413/shyam-premi-sn -f what=all`, then `gh run view <id> -R sk9836413/shyam-premi-sn`.

## Hard rules

- **Separate from EpiFive.** Never link, mention or co-brand EpiFive (epifive.com, its accounts, tags, playlists,
  watermarks, code or data). Shyam content uses the channel name only; never the owner's real name or personal phone.
- **Bhajan / mantra QA gate is never loosened.** Every deity and festival name must be pronounced and spelt right
  (e.g. "Shyam" heard as "Shaam" = reject). Fewer songs or the instrumental fallback, never a mispronounced name. Improve
  pass rates only with better generation; report low pass rates honestly.
- **Timing:** bhajan Shorts, bhajan jukeboxes and mantra-jaap videos go public 05:30-06:30 IST, rendered the evening
  before. Status videos keep their 00:30 / 20:00 slots.
- **Sati rule:** sati temples (Rani Sati Dadi, Dhandhan Sati Dadi and similar) = darshan, temple history in neutral
  words and bhakti only; never a mela, yatra, procession or amavasya celebration, never praise or depict the act, always
  the Commission of Sati (Prevention) Act 1987 disclaimer. No Rani Sati bhajans; no Amazon links on Rani Sati content.
- **Own footage / licence-safe media only.** Real footage and stills are the owner's own (`licence: own`) or
  licence-checked CC0 / PD / CC BY photos with credits. Never other channels' videos, film or label songs, or copyrighted
  audio; music only from the licence-checked `music/library`. Owner pandal footage is never called "Khatu mandir" and
  never labelled AI. AI voices only from the repo's models; never clone a real or famous voice. Khatu Shyam ji is drawn
  SHEESH (head) only.
- **Amazon.in affiliate tag `shyam0414-21`** (never `epifive-21`): 2-3 respectful puja-samagri links on long videos
  only, with the Associates disclosure line; never on Shorts, status Shorts, owner footage or Rani Sati content; no
  miracle or "abhimantrit" claims. Switch: repo variable `AMAZON_LINKS`.
- Respect the caps (3 Shorts a day via the upload guard, 1 owner-footage Reel a day, Facebook spacing); never raise a
  cap, change a cron or the scheduler, repo variables or secrets. No fake views, bots or engagement bait.
- No web pages: the Shyam GitHub Pages site was switched off on 19 Nov 2026 (owner); channels only.
- Reply to the owner in Hinglish. Commit messages end with the `Co-Authored-By:` trailer; pull with rebase before pushing.
