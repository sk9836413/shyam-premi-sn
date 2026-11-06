# Real temple footage/photos: footage/<temple-slug>/<name>.mp4|.jpg + <name>.licence.json. Rules (Hinglish): characters/REAL-FOOTAGE.md
# Photos: scripts/real-photos.mjs (Wikimedia Commons, CC0 / PD / CC BY only); temples and their Commons categories: temples.json
# Second source (6 Nov 2026): when Commons gives < 4 photos, Openverse (Flickr CC etc.) with the same licence rules ->
#   footage/<slug>/openverse-<name>.jpg + .licence.json (source "Openverse/Flickr", attribution "... via Flickr", url = Flickr page).
# Top up temples with fewer than 4 photos: node scripts/real-photos.mjs --all --min 4 --max 6
# Own phone photos (e.g. Khatu Shyam ji, Salasar): footage/<slug>/<name>.jpg + <name>.licence.json with "source": "own", "licence": "own".
