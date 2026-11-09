# Growth: the "max 3 uploads a day" change

Owner, 9 Nov 2026: from 2026-11-10 at most 3 YouTube uploads a day (scripts/day-plan.mjs), because 5-6 a day (7-9 Nov)
collapsed views from hundreds to 0-15. Every Monday the `growth` job of .github/workflows/daily.yml compares the average
views per Short before (2-8 Nov) and after (10-16 Nov, then each last 7 days) with scripts/growth-compare.mjs.
Data API lifetime views: younger videos have had less time, so compare "views per day of age" too.

## Subscriber snapshots

| Date | Subscribers | Channel views | Videos |
|---|---|---|---|
| 2026-11-09 | 43 | 4558 | 106 |
