# Mini-movie queue (STORY.md section 7)

Owner, 6 Nov 2026: "short movies" instead of narrated kathas: each temple's origin or legend as a **2-4 part** mini film
(vertical Shorts, ~2-3 min each, cliffhanger, "Part n kal subah 7 baje"), one part a day in the **morning** slot,
replacing the morning katha. Evening darshan, festival status, noon Dadi-Chhotu and the long video stay as they are.

**Gates.** A series uploads only when its `series.json` has `"approved": true` (the owner reviews the pilot first;
until then each part is rendered and parked for review). The daily pipeline (Claude writes tomorrow's part) runs only
with the repo variable `MOVIE_DAILY=on`. GPU: one Kaggle session per part, tier by the quota (animate/REPORT.md
section 11); the daily evening darshan and status Shorts are never starved.

**Order.** The list below follows automation/mandir-series.md (Rajasthan first, then the pan-India series in their
calendar rotation). A festival in the next 7 days or a `automation/trends` topic may jump the queue. Finish a series
before starting the next. Each row: series slug (folder `story/movies/<slug>/`), parts, status, the main sources to
start from (every fact still needs 2 sources in series.json), notes.

Status: `scheduled` (parts written, release days set), `active` (the daily pipeline is writing it), `queued`,
`placeholder` (waiting for the owner), `done`.

| # | Series (slug) | Parts | Status | Start sources | Notes |
|---|---|---|---|---|---|
| 1 | khatu-shyam-amar-katha: Khatu Shyam ji ki Amar Katha | 4 | scheduled 17-20 Nov 2026 (Janmotsav on 20 Nov) | series.json (aajtak, hi/en Wikipedia, Amar Ujala, devasthan.rajasthan.gov.in) | Pilot = Part 1. Not approved yet. |
| 2 | salasar-balaji: Salasar Balaji ki Katha | 3 | queued | salasarbalaji.org, tourism.rajasthan.gov.in, Churu district site, Dainik Bhaskar | Mohandas ji ki bhakti; the murti found while ploughing at Asota (Samvat 1811: give the AD year only with 2 sources); Salasar Dham. Part 4 of the Khatu series teases it. New cast: Mohandas ji, the Asota farmer. |
| 3 | mehandipur-balaji: Mehandipur Balaji ki Katha | 2-3 | queued | Dausa district site, news | The swayambhu murti legend (manyata), Pretraj Sarkar and Bhairav ji as worshipped there. No fear content, no "bhoot" sensationalism. |
| 4 | jeen-mata: Jeen Mata ki Katha | 2-3 | queued | Sikar district site, Rajasthan Tourism | Jeen and her brother Harsh (lok katha), Harshnath. |
| 5 | karni-mata: Karni Mata, Deshnoke | 2-3 | queued | Bikaner district site, Rajasthan Tourism | Karni Mata's life (15th century, sources differ on dates), the kabas. Real photos exist in footage/karni-mata. |
| 6 | shakambhari-mata: Shakambhari Mata | 2 | queued | Sikar/Jaipur district sites | Sakrai and Sambhar traditions, said neutrally. |
| 7 | somnath: Somnath Jyotirlinga ki Katha (12 Jyotirlinga 1/12) | 2-3 | queued | somnath.org, Gujarat Tourism, Shiv Purana | Chandradev's curse and Shiv's grace (Shiv Purana), the temple's history (rebuilt many times; dates with 2 sources). Real photos exist. |
| 8 | mallikarjuna, mahakaleshwar, omkareshwar ... : the 12 Jyotirlinga legends | 2 each | queued | temple trusts, state tourism, Shiv Purana | In stotram order; mention competing sites (Vaidyanath, Nageshwar) in one neutral line. |
| 9 | kedarnath: Kedarnath aur Pandav | 3 | queued | badrinath-kedarnath.gov.in, Uttarakhand Tourism | The Pandavas seek Shiv after the war, Shiv as a bull (lok katha / Panch Kedar tradition). Real photos exist. Cast: Bheem (reuse), Shiv. |
| 10 | rani-sati-dadi-katha: Rani Sati Dadi ki Katha | 2 | queued: DO NOT PRODUCE YET | Jhunjhunu district site, established news | **Sati rules (mandir-series.md) in full**: neutral history; the event in at most 1-2 plain sentences labelled as tradition; the disclaimer "Sati pratha Bharat mein kanoon (Sati Nivaran Adhiniyam 1987) dwara pratibandhit hai; yeh video sirf itihas aur aastha ki jaankari ke liye hai, is pratha ko badhava nahi deta." spoken and in the description; no fire, pyre or smoke imagery; no praise ("balidaan", "mahima"); never a mela, yatra or procession. Devotion on the temple and Dadi ji as kul devi. Owner sign-off before production. |
| 11 | teda-gela: (placeholder) | ? | placeholder | - | The owner mentioned a story "teda gela"; its meaning is being asked. Do not guess; fill in when the owner explains. |

Characters that recur (reuse the portrait, base clip and voice from characters/cast/cast.json): Krishna, Hanuman, Shiv,
Parvati, Ganesh, Lakshmi, Ram, Sita, Bheem. Temple saints (Mohandas ji, Karni Mata, ...) are added per series.
