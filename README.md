# Interview Prep Tracks

Daily audio prep for my CAA interviews. One track a day from Oct 12 to the Emory interview on Oct 23. Savannah (Nov 6) tracks come next.

Live site: https://feirzen.github.io/interview-prep/

## What's in here

| Path | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The website |
| `tracks.json` | Track list, dates, lengths, and full scripts |
| `audio/` | The MP3 for each day |
| `scripts/` | Plain-text scripts each track was made from |
| `icons/`, `manifest.webmanifest` | Favicon, home screen icon, social preview |
| `widget/interview-prep-widget.js` | Scriptable home screen widget |
| `progress.json` on the **data** branch | My marks (listened, out loud, shaky/okay/solid, notes, mock log) |

Progress lives on its own `data` branch so saving a mark doesn't rebuild the website.

## Saving progress (one-time setup)

1. Go to GitHub → Settings → Developer settings → **Fine-grained tokens** → **Generate new token** ([direct link](https://github.com/settings/personal-access-tokens/new)).
2. Name: `interview-prep`. Expiration: 90 days.
3. Repository access: **Only select repositories** → `interview-prep`.
4. Permissions → Repository permissions → **Contents: Read and write**. Leave everything else alone.
5. Generate, copy the token.
6. On the site, tap **Sync** at the top, paste the token, tap **Save**. The dot turns green when it's syncing.

Do this once per device (phone and laptop). The token stays in that browser; it's never saved in the repo.

## Home screen widget

The widget shows today's track title and date, your red/yellow/green lights across the top, and the countdown in the corner. Tap the play area to open today's track on the site. Tap Heard, Aloud, Shaky, Okay, or Solid to save a mark.

iOS widgets can't play audio themselves (only App Store apps can do that), so the play area opens the site, and the audio keeps playing with the screen locked.

1. Install **Scriptable** from the App Store (free).
2. Open this file on your phone: `widget/interview-prep-widget.js` → tap **Raw** → select all → copy.
3. In Scriptable, tap **+**, paste, then tap the title at the top and rename the script exactly **Interview Prep**. Tap Done.
4. Tap the script once to run it. Paste the same GitHub token when it asks, tap **Save token**. You'll see a preview.
5. Go to your home screen, long-press → **Edit** → **Add Widget** → Scriptable → pick the **medium** size → Add.
6. Long-press the new widget → **Edit Widget** → Script: **Interview Prep**.

Tapping a mark button opens Scriptable for a second to save it. Swipe home. The widget catches up within a few minutes (iOS decides exactly when).
