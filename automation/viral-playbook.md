# Viral playbook (learned from 40+ owner-sent references, 15 Nov 2026)

Every writer/renderer of Shyam Premi Shorts should follow this. Numbers = views of the reference Shorts.

## Formats that win again and again (whole channels, not one lucky video)
| # | Format | Proof | Our format |
|---|---|---|---|
| 1 | Kailash family stories (Shiv-Parvati-Ganesh), cute 3D or cinematic, festival tie-in, 20-60 s | 1.93 Cr, 1.13 Cr, 48 L, 15 L, 12.3 L | `kailash` (full + mini, realistic + cute-3d) |
| 2 | Pooja niyam / "वर्जित क्यों?" | 1.46 Cr (Ganesh-Tulsi) | `facts` jigyasa |
| 3 | Krishna POV: festival + modern question, one 2D character to camera | 1 Cr, 50 L, 42 L (whole channel) | `krishna-pov` (positive only) |
| 4 | Sant / lok devta chamatkar ("जब गोरखनाथ के गुस्से से…") | 48.6 L | `facts` lok devta bank |
| 5 | "क्यों?" / Kaliyug connection / strange-visual facts | 43 L, 25 L, 12.5 L | `facts` |
| 6 | Bhakt katha PART series, payoff part titled by the miracle | 21.3 L (Sudama part 4) | series (movie engine) |
| 7 | Loop / veer / status with a song (lottery) | up to 1 Cr but driven by copyrighted songs | `loop`, `veer` with OUR bhajans |

## Our own channel data (YouTube Analytics, 25 Oct - 16 Nov 2026; owner-approved plan 16 Nov 2026)
- **Status Shorts win by SHARES:** Choti Diwali 799 views / 31 shares, Dhanteras 456 / 25, Chhath Usha Arghya 239. So a
  status Short every day (day status 06:00 on non-festival days), and every status Short's YouTube description ends with
  "📲 अपने WhatsApp स्टेटस पर लगाएं और परिवार में शेयर करें 🙏" (a share ask; never on Facebook, whose bait rule forbids it).
- **Famous-temple darshan wins on retention:** Khatu Moravinandan 76%, Salasar 72%, Shakambhari 62% (135-173 views);
  Hare ka Sahara 73%, Barbarik sheesh daan 90%.
- **Long katha (5-7 min) failed:** 18-22% retention, 38-57 views -> stopped; the long slot is the weekly mantra jaap and
  festival bhajan jukeboxes (the Chhath jukebox: 170 views).
- **Facts Shorts so far:** 1-7 views each -> max 2 a week until the 25 Nov review (median under 20 = off).

## Shorts feed audit (17 Nov 2026, automation/feed-audit-2026-11-17.md; YouTube Analytics retention curves)
- **Status = search, darshan = feed.** Status Shorts: 72% of views from search, 14% from the Shorts feed, 67% kept at 3 s
  (a 42-point drop), 35% viewed, 5-16% reach the end. Darshan Shorts: 77% from the feed, 120% kept at 3 s, 57% viewed.
- Status loops are now 12-20 s, end on their own picture (no subscribe line), and show the festival name big on frame 0.
- Darshan hooks need the temple name AND a reason to keep watching ("Neele ghode ka asvar kaun?" 94% feed views;
  name-only hooks after 9 Nov got almost no feed views); validate.mjs enforces it.
- Returning (subscribed) viewers come from Khatu Shyam ji / Rajasthan temple Shorts, never from status Shorts.
- The Monday growth report has a "Retention (Shorts feed)" table (scripts/retention.mjs).

## Algorithm research (20 Nov 2026, E:/SK/epifive-social/ALGO-RESEARCH-2026-11.md) applied to status Shorts
- **First 1-2 s:** frame 0 = the deity's face, large (status-engine compose puts a deity scene first; prompts ask for the
  face large and clear), the festival name in 2-4 huge Hindi words; the YouTube thumbnail is the same frame (0.1 s).
- **Sends (Instagram's strongest signal for non-followers):** the last 3 s are the forwardable greeting ("आपको और आपके
  परिवार को / <festival> की शुभकामनाएं 🙏", pill "इसे अपने परिवार को भेजें 🙏"); Instagram caption = the same greeting + the
  send line; Facebook = the greeting only (its bait rule forbids asks). Never "share to 5 people", never follow/subscribe
  gating.
- **Length / loop:** 15-30 s (3 scenes of 6 s), the greeting fades back into frame 0.
- **Captions:** short and relevant, at most 5 hashtags on Instagram (meta.mjs / photos.mjs cap them), exactly 3 on Facebook.
  YouTube keeps the search title "<Festival> Status 2026 | <Hindi> स्टेटस वीडियो #Shorts".
- **Trial Reels:** the Graph API supports them (`trial_params`); a greeting-first second hook of each festival's 00:30
  variant goes out as a Trial Reel at 07:30 when the repo variable IG_TRIAL is "on" (off until the owner turns it on).
- **Weekly:** the Monday report adds "Shorts of the last 7 days" (engaged views, % viewed, feed share, top 3 by feed
  share); viewed-vs-swiped and Instagram/Facebook insights are owner screenshots (not in the APIs we can use).

## Rules that made the difference
1. **First second = a question or a shock.** 😱 / "क्यों?" / "जब…" / "फिर … ने जो किया…" / "सब साथ छोड़ दें…". Never "आज सुनिए…".
2. **Cover frame:** 3-line big text (white / giant yellow / white on red band), red arrow, OR one strange oddly-scaled scene that asks a question by itself.
3. **Characters talking beat narration over a still.** Dialogue, POV, family scenes.
4. **Festival + everyday life:** tie to the festival people are searching that week.
5. **Short wins:** 20-60 s for most; 2-3 min only for series/epic facts.
6. **Series build subscribers:** EP/Part numbering, cliffhanger, 1-line recap, payoff part titled by the payoff.
7. **Emotion:** seva-bhaav moments (Hanuman serving Ram, a child offering to Maa), love, a gentle moral.
8. **Sound matters:** expressive voice + music bed (bansuri/tanpura/tension pad/dhol), ducked under speech.
9. **Judge a reference by the whole channel**, not one video: lucky one-offs and reuploads are noise.

## Never (even though some viral channels do it)
TV-serial clips or actor likenesses, real people's voices (e.g. a kathavachak's pravachan), copyrighted trending songs or lyrics, reuploads, mocking deities or rituals, invented scripture, pseudo-science, fear-mongering, filmi romance with deities. Folk claims are labelled "लोककथा/मान्यता".
