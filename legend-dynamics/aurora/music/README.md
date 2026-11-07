# Music for this setting

Put this setting's audio files here (MP3 is best; M4A, OGG and Opus work too), and the website gets a music page
for it with a player and downloads. Nothing shows on the site until there's at least one track.

The easy way, which copies a track in, converts WAV, FLAC or AIFF to MP3, and lists it with a title:

    python3 tools/music.py add <setting> <file> --title "The Long Road" --mood Travel --use "For the trail between towns." --credit "Composed by …" --license "…" --loop

(<setting> is western, spaceopera, fantasy or aurora; --loop makes the track repeat by default, for ambience.)
Or copy files in by hand: they're listed by file name, after any that tracks.json names. Edit tracks.json to set
titles, the order, and an "intro" sentence for the top of the page. Each file must be under 25 MB (Cloudflare's limit).

Then rebuild the site: python3 tools/build-site.py --zip /home/user/legend-dynamics-site.zip
