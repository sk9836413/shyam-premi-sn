AI pictures for the daily photo posts (scripts/photos.mjs): <key>/<name>.jpg + <name>.json {ai, source, prompt, made}.
keys: khatu (Sandhya aarti, Ekadashi; Khatu Shyam ji is ALWAYS the sheesh form: no body, arms or flute), janmotsav, and festival keys (dhanteras, choti-diwali, diwali, bhai-dooj, chhath, tulsi-vivah).
Every card made from these carries "AI chitra (sanketik)" on the image and in the caption. `node scripts/photos.mjs topup` adds at most 2 a day (Workers AI FLUX, ~170 neurons each) on the morning runs.
Real photos of the owner always win over these: footage/khatu-shyam-mandir/ (his Khatu mandir photos, none yet), then
footage/shyam-baba-pandal-darshan/ (20 Nov 2026: 23 real darshan stills from his own videos/photos at a Shyam Baba PANDAL,
not the Khatu mandir; scripts/shyam-darshan.mjs). While those stills exist, `topup` makes no new khatu AI pictures.
The khatu AI prompt (KHATU_SHEESH = shyam-darshan.mjs KHATU_DARSHAN_PROMPT) is written from those real stills.
