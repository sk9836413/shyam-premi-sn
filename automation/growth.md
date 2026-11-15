# Growth: the "max 3 uploads a day" change

Owner, 9 Nov 2026: from 2026-11-10 at most 3 YouTube uploads a day (scripts/day-plan.mjs), because 5-6 a day (7-9 Nov)
collapsed views from hundreds to 0-15. Every Monday the `growth` job of .github/workflows/daily.yml compares the average
views per Short before (2-8 Nov) and after (10-16 Nov, then each last 7 days) with scripts/growth-compare.mjs.
Data API lifetime views: younger videos have had less time, so compare "views per day of age" too.

## Subscriber snapshots

| Date | Subscribers | Channel views | Videos |
|---|---|---|---|
| 2026-11-09 | 43 | 4558 | 106 |

## Character series, tracked on their own (from 15 Nov 2026)

Two new formats, each in its own row of the weekly per-format table (scripts/growth-compare.mjs formatOf: the slug's
slot, `kailash` and `pov`), and each upload's line in automation/published.md carries its length, lip-sync share and
GPU minutes:
- **Kailash Parivar** (`<date>-kailash-<idea>`, STORY.md section 9): realistic-cinematic Kailash family Shorts, 55-75 s,
  Mon/Thu/Sat + one festival tie-in a week, 08:00 IST. Replaces the weekday day-status morning Short on its days.
- **Shri Krishna kehte hain** (`<date>-pov-<topic>`, STORY.md section 10): our own 2D Krishna POV monologue, 45-60 s,
  Tue/Fri + one festival tie-in a week, 08:00 IST. Replaces the weekday day-status morning Short on its days.
Both start only after the owner approves the pilot ("approved": true in automation/kailash-episodes.json /
automation/krishna-pov-topics.json). Compare after 4 weeks: views per Short vs the day-status Shorts they replace
(same weekdays) and vs the 84 views/Short baseline of 2-8 Nov; keep, change the days or stop (KAILASH=off /
KRISHNA_POV=off).
