# Gagan Diwali Soiree: Guest Photo Website (Full Spec for Claude Code)

> **How to use this file:** Put it in an empty project folder, open Claude Code there, and say:
> *"Read DIWALI_PHOTO_SITE_PLAN.md fully and follow it. Start with Phase 0 and ask me for every missing item before you build."*

---

## 0. Instructions to Claude Code (read first)

You are building a complete, free-to-host web app for a house party. Work in this order:

### Phase 0: Ask me for everything you need (do NOT invent values)
I will not volunteer any information. **You must ask me for every item in Section 12 ("Information checklist")** in one consolidated message, with a one-line hint on how to get each item. Do not use fake phone numbers, addresses, links, or credentials. If I can't provide something yet, use a clearly marked placeholder in `frontend/src/config/siteConfig.js` and list it in your final summary under "STILL MISSING".

### Phase 1: Build
1. Scaffold the monorepo (Section 4).
2. Build the Python backend (Section 7).
3. Build the React frontend (Sections 5 and 6).
4. Wire them together.

### Phase 2: Verify
Run the backend and frontend locally, test every endpoint and every page, test an upload with a JPEG and a HEIC file, and fix problems.

### Phase 3: Document
Write a `README.md` in the repo root with: how to run locally, how to set up Google Drive access, how to deploy, and the pre-event checklist (Sections 9, 10, 11 below are the draft; verify them against what you actually built).

### Rules
- Never commit secrets. `.env`, `client_secret*.json`, and token files go in `.gitignore`. Provide `.env.example` files.
- Check current official docs (Google Drive API, Render, Cloudflare Pages, Tailwind, Vite) before relying on version-specific details. Free-tier terms change often.
- The event is **14 November 2026**, so prioritise a working upload and gallery first, then polish the animations.

---

## 1. Project goal

A website for my Diwali party guests. Guests scan a QR code or open a link and can:
- See party info and the venue location.
- **Upload photos** from Android phones, iPhones, and Windows computers. No login or app install.
- View a **live gallery** of uploaded photos.
- Read a thank-you page after the party.

**All photos are stored in Google Drive** (my personal Google account). The website displays them, but Drive is the permanent storage. Everything must run on **free** services ($0).

---

## 2. Is this feasible? (Yes, with these caveats)

### 2.1 How it works
1. **Upload page:** a file picker (`<input type="file" accept="image/*" multiple>`). On Android and iOS it lets guests choose from the gallery or take a photo.
2. **Backend (Python/FastAPI):** receives each upload and pushes it to a Google Drive folder via the Drive API.
3. **Gallery page:** calls the backend, which lists files from the Drive folder and returns image info for display.

### 2.2 Latency and loading problems to avoid
- **Do not hotlink full-size Drive images.** Phone photos are 3-8 MB each. Loading dozens on a phone over mobile data is slow.
- Drive is not an image CDN. Direct links (`drive.google.com/uc?...`) can be throttled or change behaviour.
- Drive API thumbnail links expire and are small.

### 2.3 The fix: resize in the backend, proxy images through it
On upload, the backend creates:
- the **original** (stored in Drive as the permanent archive),
- a **medium** JPEG (~1600 px wide) for the lightbox view,
- a **thumbnail** JPEG (~400 px wide) for the gallery grid.

All three are stored in Drive (originals in the main folder, `medium/` and `thumbs/` subfolders). The gallery is served from thumbs/medium via the backend, with long browser-cache headers. The original is only opened from Drive directly.

Also:
- Use `loading="lazy"`; the gallery shows only ~10 photos at a time anyway.
- **Convert HEIC (iPhone default) to JPEG** for display. Many browsers cannot show HEIC.
- Cache the Drive file list in memory (30-60 s) so the gallery does not hit the Drive API on every view.

### 2.4 Other things to plan for
- **Spotty venue Wi-Fi:** upload one file at a time with a progress bar and automatic retry.
- **Privacy:** the Drive folder stays **private**. Guests view photos through the website (backend proxy), not through Drive. Optional event passcode (Section 7.5).
- **Moderation:** optional host-only delete endpoint (Section 7.5).

---

## 3. Important correction: Google Drive authentication

**Do NOT use a service account** with a normal Gmail account. Service accounts have **no storage quota** and cannot own files in a personal My Drive folder; uploads fail with `storageQuotaExceeded` ("Service Accounts do not have storage quota"). Shared Drives would fix it, but they require paid Google Workspace.

**Use OAuth 2.0 with a stored refresh token for my own Google account** instead:
- I authorize once in the browser via a one-time local script.
- The backend then uploads as me using the refresh token (stored as an environment variable on the host).
- Guests never sign in.
- Photos count against my personal Drive quota (15 GB free, shared across Gmail, Drive, and Photos), which is roughly 2,000 to 4,000 phone photos.

Notes:
- Use my **personal** Gmail and GitHub accounts, not work accounts.
- While the Google Cloud OAuth app is in **"Testing"** status, refresh tokens expire after about 7 days. That is fine for a one-off event, but generate the token close to the event date (or publish the app to "In production"). Verify this against current Google docs.
- **Scope choice:** `drive.file` (least privilege) only lets the app access files/folders *it created*. So the setup script should **create the party folder itself** and print its ID. If I already have an existing folder I want to use, use the full `drive` scope instead and explain the tradeoff to me. Verify current scope behaviour in the docs.
- The Drive folder must stay **restricted** (not "anyone with the link"). People who open the Drive link must request access.
- Enable the Google Drive API in Google Cloud Console. No billing account is required.

---

## 4. Repository layout (single monorepo, Python + React)

```
diwali-photos/
├── README.md
├── .gitignore
├── render.yaml                # optional: Render blueprint for the backend
├── backend/
│   ├── main.py                # FastAPI app
│   ├── app/                   # (suggested) config.py, drive.py, images.py, routes/...
│   ├── scripts/
│   │   └── get_refresh_token.py   # one-time OAuth + create Drive folder
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example           # VITE_API_BASE_URL=
    ├── public/                # favicon, _redirects (for Netlify)
    └── src/
        ├── main.jsx
        ├── index.css          # Tailwind import + THEME COLOR TOKENS (Section 5.2)
        ├── App.jsx            # router + floating nav + page transitions
        ├── config/siteConfig.js   # all editable text/links/numbers
        ├── components/        # FloatingNav, Diya, Fireworks, Petals, Rangoli, CopyButton, ...
        └── pages/             # Home, Gallery, Upload, ThankYou, Location
```

Stack: **Python (FastAPI) backend, React (Vite) frontend, Tailwind CSS.**

---

## 5. Frontend design system

### 5.1 Theme: Indian Royal Diwali
Rich, regal, festive: maroon velvet, gold zari, marigold glow. Think palace durbar meets festival of lights. Use motifs such as diyas, rangoli/mandala patterns, paisley, toran/bunting, lanterns, marigold petals, and fireworks. Everything must feel like one cohesive design. **No page may deviate from the theme, fonts, or colour system.**

### 5.2 Colour system (single source of truth)
There are exactly **three brand colours**: **Primary, Secondary, Third**. They are defined **once**, in the main stylesheet (`src/index.css`, imported by `main.jsx`), and referenced everywhere by their **global names**. Never hard-code hex values in components.

Suggested defaults (I can change them in this one place):

| Token | Name | Default | Role |
|---|---|---|---|
| `primary` | Royal maroon | `#7A1230` | backgrounds, major surfaces |
| `secondary` | Antique gold | `#D4A431` | headings, borders, highlights, buttons |
| `third` | Marigold saffron | `#FF7A1A` | accents, glow, flames, call-to-action hover |

Tailwind v4 (CSS-first config) example:

```css
@import "tailwindcss";

@theme {
  --color-primary: #7A1230;
  --color-secondary: #D4A431;
  --color-third: #FF7A1A;

  --font-display: "Cinzel Decorative", "Playfair Display", serif;
  --font-body: "Poppins", system-ui, sans-serif;
}
```

Usage: `bg-primary`, `text-secondary`, `border-third`, `shadow-[0_0_30px_var(--color-third)]`, etc.

Rules:
- Derived tints/shades (darker maroon, glow, gradients) must be computed from the three tokens (e.g. `color-mix(in srgb, var(--color-primary) 70%, black)`), not new hard-coded colours.
- A neutral ivory for body text is allowed (define it once as a neutral token, e.g. `--color-ink`).
- If Tailwind's current version uses a different config style, adapt but keep the same principle: one definition, global names everywhere.

### 5.3 Typography
Two font families only, defined as tokens (display for headings, body for text). Load from Google Fonts (or self-host), with fallbacks. Same fonts on every page.

### 5.4 Animations (lots of them, tasteful and smooth)
Use **Framer Motion** (`motion` package) plus CSS/SVG/canvas. Ideas:
- Flickering **diya flames** and floating diyas drifting up.
- Falling **marigold petals / golden sparkles** in the background.
- A lightweight **fireworks** canvas burst on the home page (and when an upload succeeds).
- Slowly rotating **rangoli / mandala** SVG behind hero sections.
- Shimmering gold gradient on the main title.
- Hanging **toran** (bunting/bells) swaying at the top of pages.
- Scroll-reveal for cards, hover glows, button ripples, animated page transitions (`AnimatePresence`).
- Gallery photos animate in/out when the set rotates.

Requirements:
- Respect `prefers-reduced-motion` (reduce or disable heavy effects).
- Keep it smooth on mid-range phones: cap particle counts on mobile, use `transform`/`opacity`, no huge images or videos.

### 5.5 Floating interactive navigation bar
- A floating **pill-shaped** nav (glassmorphism / gold border), fixed on screen: bottom-centre on mobile (thumb reach), top-centre on desktop.
- Items (in order): **Home**, **Gallery**, **Upload**, **Thank You**, **Location**.
- Icons plus labels (labels may hide on very small screens).
- Animated active indicator that slides between items (`layoutId`), hover/tap effects, subtle glow.
- Use `react-router-dom`. Pages must not be hidden behind the nav (add bottom/top padding).

### 5.6 General frontend rules
- Mobile-first: guests use phones (Android and iPhone) mostly, plus Windows laptops.
- All editable content (event name, date, time, address, links, phone numbers, rotation interval) lives in `src/config/siteConfig.js`.
- Accessible: sufficient contrast, focus states, alt text, readable font sizes.
- Include a **Copy** button component (clipboard API with a fallback for browsers that block it) showing an animated "Copied!" toast.

---

## 6. Pages and content

Keep my wording and meaning, but fix spelling and grammar. The tone is warm and friendly.

### 6.1 Home page
Centered, big and bold title: **"Gagan Diwali Soiree"** (animated gold shimmer, diyas, rangoli behind).

Below it, a short paragraph wishing everyone a Happy Diwali. Suggested copy:
> *May this festival of lights fill your life with joy, warmth, laughter, and prosperity. Wishing you and your family a very Happy Diwali!*

Below that:
> **I am looking forward to celebrating this Diwali with you all at my place on the 14th of November 2026. The party starts at 7 PM.**
>
> *You are receiving this website because you have RSVPed to the party.*

Then a section **"Basic information for the party"** as animated cards/list (with icons):
1. Having fun and enjoying is the top priority.
2. **Strictly Indian traditional wear:** Kurtas for boys, Saree or Lehenga for girls.
3. It's a **BYOB** party.
4. If you're not drinking, don't worry, non-alcoholic drinks are available.
5. **Food is already catered for**, so you don't have to worry about that.
6. The party starts at **7 PM**, so come as early as possible since we will even be **burning crackers**.
7. Feel free to bring any **board games** or come up with game night ideas so we can all play together.
8. **No loud music after 10:30 PM** since it's a residential area, but feel free to chill as long as you want, the night is young.
9. Please **tag me** on all the stories you upload of the night :)
10. **Strictly no illegal substances.**

### 6.2 Gallery page
- A grid showing **10 photos** at a time (e.g. 2 columns x 5 on mobile, 5 x 2 on desktop).
- The displayed set **rotates automatically every 15 minutes** (configurable between 15 and 20 minutes via backend env var `GALLERY_ROTATE_MINUTES`). The backend decides the set deterministically from the clock, so **all guests see the same 10 photos** at the same time, cycling through all photos before repeating. If fewer than 10 photos exist, show all.
- The frontend refetches periodically (e.g. every minute) and animates the swap when the set changes. Optionally show a small "next shuffle in mm:ss" countdown.
- Clicking a photo opens an animated **lightbox** with the medium-size image.
- Thumbnails use lazy loading; show skeleton/shimmer placeholders while loading.
- Empty state (no photos yet): friendly animated message with a button to the Upload page.

### 6.3 Photo upload page
- A simple page centred around one **big, stylish upload button**. Do **not** use the browser's default file-input look. Make it a themed, animated button (gold border, glowing diya/sparkle effect, hover/tap animation).
- Hidden `<input type="file" accept="image/*,.heic,.heif" multiple>` triggered by the button.
- After selecting: show a list/grid of selected photos with **per-file progress bars**, success ticks, and **retry** on failure. Upload files **one at a time** (or max 2 concurrent) with automatic retries. Celebrate success with a small fireworks/sparkle animation.
- **Below the button: instructions** stating the upload works for **Android phones, Apple iPhones, and Windows computers**, e.g.:
  - *Android:* tap Upload, pick photos from your gallery (or take new ones).
  - *iPhone:* tap Upload, choose "Photo Library" (or Take Photo). HEIC photos are handled automatically.
  - *Windows computer:* click Upload and select image files from your folders.
- **Below that: the Google Drive folder link** with a **Copy link** button, for guests who want to open the Drive folder in another tab. Add a note that the folder is private and they must **request access** to view it.

### 6.4 "Thank you for coming" page
A big, heartfelt, animated page. Suggested copy (keep the meaning, polish as needed):
> **It wouldn't have been the same without you.**
>
> Thank you for making this Diwali so special. Your laughter, your outfits, your energy, and your presence made the night unforgettable. Thank you for making this happen!
>
> Wishing you and your loved ones a very **Happy Diwali**. May the lights of the diyas bring happiness, health, and success into your lives all year long.
>
> **Please upload all the photos you clicked to the Google Drive folder (use the Upload page), so everyone can access them.**

Include a prominent button linking to the Upload page and the Drive link with a Copy button.

### 6.5 Home Location page
- An embedded **Google Map** with a pin on the **exact house location** (use the Google Maps embed iframe, which needs no API key).
- Below it, the **detailed address in text**.
- A link to the pinned location on Google Maps, **with a Copy link button** next to it, and an "Open in Maps" button.
- At the end: *"If you have trouble finding the location, feel free to call me on any of these numbers:"* followed by **3 phone numbers** (tappable `tel:` links, optionally with names). Ask me for them.

---

## 7. Backend (Python / FastAPI)

### 7.1 Stack
`fastapi`, `uvicorn[standard]`, `python-multipart`, `google-api-python-client`, `google-auth`, `google-auth-oauthlib`, `pillow`, `pillow-heif`, `slowapi` (rate limiting), `python-dotenv` or `pydantic-settings`. Pin versions; check current compatibility.

### 7.2 Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check (also used by an uptime pinger to keep the free host awake) |
| GET | `/api/config` | Public config the frontend may need (rotation interval, upload limits, Drive folder link if set) |
| POST | `/api/upload` | Accept **one image per request** (multipart). Validate, convert/resize, upload original + medium + thumb to Drive. Return photo id. |
| GET | `/api/gallery` | Returns the current rotating set of up to 10 photos: `{photos:[{id, thumb_url, medium_url}], rotation_ends_at, total}` |
| GET | `/api/photos/{id}/thumb` | Stream thumbnail from Drive, with `Cache-Control: public, max-age=31536000, immutable` |
| GET | `/api/photos/{id}/medium` | Stream medium image, same caching |

Optional (Section 7.5): `DELETE /api/admin/photos/{id}`.

### 7.3 Upload pipeline
1. Validate: image type by **content** (not only the extension), max size per file (default 25 MB, env-configurable), allowed: JPEG, PNG, WebP, HEIC/HEIF.
2. Generate a unique id (UUID). Keep the original bytes unchanged for the Drive original.
3. Open with Pillow (+ `pillow-heif` registered), apply `ImageOps.exif_transpose`, convert to RGB.
4. Create **medium** (~1600 px long edge, JPEG ~82-85 quality) and **thumb** (~400 px, JPEG ~75-80).
5. Upload all three to Drive (resumable upload) into: main folder (original), `medium/` subfolder, `thumbs/` subfolder. Tag each Drive file with `appProperties` (`photo_id`, `variant`) so the index can be rebuilt after a restart.
6. Run blocking Drive/Pillow work in a threadpool so the event loop isn't blocked. Process **one file at a time** and free memory promptly (the free host has about 512 MB RAM).
7. Add the new photo to the in-memory index immediately.

### 7.4 Gallery logic and caching
- Keep an **in-memory index** `{photo_id: {thumb_file_id, medium_file_id, original_file_id, created_time}}`, rebuilt from Drive on startup and refreshed every ~60 seconds and after each upload.
- **Rotation:** `window = floor(now_epoch / (GALLERY_ROTATE_MINUTES * 60))`. Use a deterministic seeded shuffle so every client gets the same 10 photos for the same window, cycling through all photos before repeating.
- **Do not rely on local disk.** The free host's filesystem is temporary, so everything persistent lives in Drive.
- Deal with Drive API errors and rate limits gracefully (retries with backoff, clear error messages to the frontend).

### 7.5 Security and extras
- **CORS:** allow only the deployed frontend origin(s) plus `http://localhost:5173` for development (env `CORS_ORIGINS`).
- **Rate limiting** per IP on `/api/upload`.
- Never expose Google credentials to the frontend.
- **Optional event passcode:** if `EVENT_PASSCODE` is set, `/api/upload` requires it (header). Default: disabled. Ask me whether I want it.
- **Optional admin delete:** `DELETE /api/admin/photos/{id}` guarded by `ADMIN_TOKEN` header, removing all three Drive files. Ask me whether I want it.

### 7.6 Environment variables (`backend/.env.example`)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
DRIVE_FOLDER_ID=
DRIVE_FOLDER_LINK=
CORS_ORIGINS=http://localhost:5173
GALLERY_ROTATE_MINUTES=15
MAX_UPLOAD_MB=25
EVENT_PASSCODE=
ADMIN_TOKEN=
```

### 7.7 One-time setup script: `backend/scripts/get_refresh_token.py`
Using `google-auth-oauthlib` `InstalledAppFlow.run_local_server`, it should:
1. Read the OAuth client file (`client_secret.json`, git-ignored).
2. Open the browser for me to authorise with my personal Gmail.
3. Create the party folder (and `medium/`, `thumbs/` subfolders) in my Drive, if using the `drive.file` scope.
4. Print the refresh token, client id, folder id, and the folder link in a format I can paste into `.env` and the host's environment settings.

---

## 8. Frontend to backend integration
- `VITE_API_BASE_URL` (e.g. `http://localhost:8000` locally, the Render URL in production).
- Handle the **cold start** of the free host (can take ~1 minute): show a friendly themed "waking up the diyas..." loader and retry automatically rather than failing instantly.
- Uploads: sequential, with `XMLHttpRequest` or axios for progress events; retry up to 3 times with backoff.

---

## 9. Run locally (draft; verify and finalise in README)

**One-time Google setup**
1. Go to Google Cloud Console and create a project (personal Google account).
2. Enable the **Google Drive API**.
3. Configure the **OAuth consent screen** (External), and add my Gmail as a **test user**.
4. Create an **OAuth client ID** of type **Desktop app**, then download the JSON as `backend/client_secret.json` (git-ignored).
5. Run `python backend/scripts/get_refresh_token.py` and copy the printed values into `backend/.env`.

**Backend**
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # then fill in values
uvicorn main:app --reload --port 8000
```
API docs at http://localhost:8000/docs

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```
Open http://localhost:5173

---

## 10. Hosting (all free; verify current terms before signing up)

| Part | Where | Notes |
|---|---|---|
| React frontend | **Cloudflare Pages** (or Netlify / Vercel / GitHub Pages) | Static hosting is free almost everywhere, no sleep, no card. |
| Python backend | **Render** free web service | No card needed, but it **sleeps after ~15 minutes** idle and takes about a minute to wake. |
| Photo storage | **Google Drive** (my personal account) | Free 15 GB. |

Not recommended in 2026 (as of my research): Fly.io, Heroku, Koyeb (no usable free tier for new accounts), and Railway (only a one-time trial credit).

**Free-tier catches**
- **Cold starts:** open the site just before guests arrive, and/or use a free pinger (e.g. UptimeRobot hitting `/health` every 5 minutes) during the party.
- **Bandwidth:** Render's free outbound bandwidth was reported to be around 5 GB/month (it was cut in 2026). Photos pass through the backend, so serve small thumbnails and medium images with long cache headers. Check Render's pricing page.
- **Temporary disk:** nothing persistent on the server; Drive holds everything.
- **Drive storage:** 15 GB shared across my Google account.
- Free tiers change often, so recheck terms.

### 10.1 Deploy steps (draft)
1. Push the repo to GitHub (personal account).
2. **Backend on Render:** New Web Service, connect the repo, root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set all env vars from Section 7.6. Pin the Python version if needed.
3. **Frontend on Cloudflare Pages:** connect the repo, root `frontend`, build command `npm run build`, output directory `dist`, env var `VITE_API_BASE_URL=<Render URL>`. (For Netlify, add `public/_redirects` containing `/* /index.html 200` for SPA routing. For GitHub Pages, use `HashRouter` or a 404 fallback.)
4. Go back to Render and set `CORS_ORIGINS` to the final frontend URL, then redeploy.
5. Set up the UptimeRobot ping on `<Render URL>/health`.
6. Generate a **QR code** pointing to the frontend URL to display at the party (offer to generate a printable PNG).

---

## 11. Pre-event checklist (event: 14 Nov 2026, 7 PM)
- [ ] Refresh token generated recently (valid through the event; Testing-mode tokens expire in about 7 days).
- [ ] Deployed and tested **at least a day before** the event.
- [ ] Upload test on **iPhone (Safari)**, **Android (Chrome)**, and **Windows (Chrome/Edge)**, including a HEIC photo and several photos at once.
- [ ] Gallery shows photos; rotation works; lightbox works.
- [ ] Drive folder opened in an incognito window is **restricted** (asks for access).
- [ ] Copy-link buttons work on mobile.
- [ ] Location pin and phone numbers are correct (tap-to-call works).
- [ ] Wake the backend just before guests arrive; the pinger is running.
- [ ] QR code printed or ready to share.
- [ ] Spot-check Drive storage space.

---

## 12. Information checklist (Claude Code must ask me for ALL of this)

Ask in one message, with hints:

**Party and content**
1. Confirm the exact event title ("Gagan Diwali Soiree"), date (14 Nov 2026), and start time (7 PM). Anything to add or change in the info list?
2. **Full address text** of my home for the Location page.
3. **Google Maps pinned location link** (Google Maps, then Share, then Copy link) and, if possible, the **latitude/longitude** or the **"Embed a map" HTML** (Share, then Embed a map).
4. **Three phone numbers** (with names/labels if I want them) for people to call.

**Google Drive**
5. My **personal Google account email** to use for Drive storage.
6. Whether I already have a Drive folder for the party, or should the setup script **create a new one** (recommended)?
7. The **Drive folder link** (if an existing folder is used) or confirmation that the script's created folder link should be used on the site.
8. The **OAuth client JSON** from Google Cloud Console (walk me through creating it step by step, Section 9, if I don't have it). Remind me never to commit it or paste it into the frontend.

**Design and behaviour**
9. Approve or change the three **theme colours** (Primary / Secondary / Third) and the defaults in Section 5.2.
10. Gallery rotation interval: 15 or 20 minutes?
11. Do I want an **event passcode** for uploads? An **admin delete** feature?
12. Do I want the nav at the top or bottom on desktop? (Default: bottom on mobile, top on desktop.)

**Hosting and repo**
13. GitHub repo name and whether it is public or private (it should contain no secrets either way).
14. Which frontend host: Cloudflare Pages (default), Netlify, Vercel, or GitHub Pages? I will create the accounts myself if guided step by step.
15. Whether I want the QR code generated.

---

## 13. Final deliverables
- Working monorepo (`backend/`, `frontend/`) running locally.
- `README.md` with: local run steps, Google Drive setup, deployment steps (Render + Cloudflare Pages), pre-event checklist, troubleshooting (HEIC, cold starts, `storageQuotaExceeded`, CORS, expired refresh token).
- `.env.example` files for both apps and a proper `.gitignore`.
- A final summary listing anything still missing (placeholders) and exact next steps for me.
