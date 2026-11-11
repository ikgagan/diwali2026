# Gagan's Diwali Soirée: Guest Photo Website

A free-to-host party site for **14 November 2026, 7 PM**. Guests open a link, read the party info,
upload photos from any phone or laptop (no login), and watch a live gallery. Every photo is stored in
the host's private Google Drive folder.

| Part | Tech | Hosted on |
|---|---|---|
| `frontend/` | React 19, Vite 8, Tailwind 4, Motion | GitHub Pages: `https://ikgagan.github.io/diwali2026/` |
| `backend/` | Python 3.12, FastAPI, Pillow + pillow-heif, Google Drive API | Render free web service |
| Photos | Original + 1600 px medium + 400 px thumbnail | Google Drive (`medium/`, `thumbs/` subfolders) |

---

## 1. Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # then fill in the Google values (section 2)
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs. Health: http://localhost:8000/health.

**No Google credentials yet?** Run the API with an in-memory fake Drive instead:

```powershell
python scripts/run_with_fake_drive.py
```

Passcode is `diya`, admin token is `admin`, and uploads vanish when the server stops.

### Frontend

Node.js 22 or newer is required. On this machine Node 26 is installed at
`C:\Users\gagan.i.k\AppData\Local\Programs\nodejs`; add that folder to your PATH (Settings > System >
About > Advanced system settings > Environment Variables > User `Path`) or run it with the full path.

```powershell
cd frontend
npm install
copy .env.example .env          # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Shortcut: double-click `frontend\dev.cmd` (installs packages if needed and starts Vite without touching PATH)
and `backend\dev.cmd` (starts the API with the fake Drive using the project venv).

Open http://localhost:5173.

### Tests

```powershell
cd backend
.venv\Scripts\python -m pytest -q
```

The suite covers JPEG and HEIC uploads, content-based validation, size limits, rotation logic,
passcode and admin protection, partial-failure cleanup and index rebuilds, all against a fake Drive.

---

## 2. Google Drive setup (one time, about 10 minutes)

Use the **personal** Google account that owns the party folder (`diwaligagan@gmail.com`), not a work account.

1. Open https://console.cloud.google.com and create a project (any name, e.g. `diwali-photos`). No billing needed.
2. **APIs & Services > Library**: search "Google Drive API" and click **Enable**.
3. **APIs & Services > OAuth consent screen** (Google may call this "Google Auth Platform"):
   - User type **External**, app name "Diwali Photos", your Gmail as support and developer contact.
   - Scopes: skip for now (the script requests them).
   - **Test users**: add your Gmail. Save.
4. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Application type **Desktop app**. Create, then **Download JSON**.
   - Save it as `backend/client_secret.json`. It is git-ignored. Never paste it into the frontend or a chat.
5. Authorise and link the existing party folder:

   ```powershell
   cd backend
   .venv\Scripts\activate
   python scripts/get_refresh_token.py --folder-id 1wV-77g0hQcs3SFf-OZYM1sZd---WQ3LS --write-env
   ```

   A browser opens. Sign in with the personal Gmail. You will see "Google hasn't verified this app":
   click **Advanced > Go to Diwali Photos** (it is your own app). Allow Drive access.
   The script creates `medium/` and `thumbs/` inside the folder and, with `--write-env`, writes the five
   `GOOGLE_*` / `DRIVE_*` lines straight into `backend/.env`. Without the flag it prints them for you to paste.
   Later, copy the same five lines from `backend/.env` into Render.

**Why the full `drive` scope?** The least-privilege `drive.file` scope can only write into folders the
app itself created. Because you want to keep your existing folder, the script requests full Drive
access for the token. The token lives only in `backend/.env` and in Render's environment, never in the
frontend or the repo. If you would rather use `drive.file`, run
`python scripts/get_refresh_token.py --create-folder "Gagan Diwali Soiree 2026"` and use the new folder it prints.

**Token expiry.** While the consent screen is in **Testing**, Google expires the refresh token after
**7 days**. Either re-run the script on 12 or 13 November, or set the consent screen to **In production**
(Publish app). Publishing an unverified app with the Drive scope still works for your own account; you just
see the "unverified" warning once.

**Keep the folder private.** Do not switch it to "Anyone with the link". Guests view photos through the
website. Anyone opening the Drive link must request access, and you approve them.

---

## 3. Deploy

### 3.1 Push to GitHub

```powershell
cd c:\Users\gagan.i.k\Desktop\diwaliWebsite
git init
git add .
git commit -m "Diwali photo site"
git branch -M main
git remote add origin https://github.com/ikgagan/diwali2026.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `client_secret*.json`, `node_modules/`, `dist/` and the venv.
Check with `git status` that no secret file is staged.

### 3.2 Backend on Render (free)

1. https://dashboard.render.com > **New > Web Service** > connect the `ikgagan/diwali2026` repo.
2. Settings (or use **New > Blueprint** which reads `render.yaml`):
   - Root directory: `backend`
   - Runtime: Python, Instance type: **Free**
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
   - Health check path: `/health`
3. **Environment variables** (Environment tab):

   | Key | Value |
   |---|---|
   | `PYTHON_VERSION` | `3.12.10` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | from the setup script |
   | `DRIVE_FOLDER_ID` | `1wV-77g0hQcs3SFf-OZYM1sZd---WQ3LS` |
   | `DRIVE_FOLDER_LINK` | `https://drive.google.com/drive/folders/1wV-77g0hQcs3SFf-OZYM1sZd---WQ3LS` |
   | `CORS_ORIGINS` | `https://ikgagan.github.io` |
   | `GALLERY_ROTATE_MINUTES` | `20` |
   | `MAX_UPLOAD_MB` | `25` |
   | `EVENT_PASSCODE` | the word guests must type on the Upload page |
   | `ADMIN_TOKEN` | a long random string; generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

4. Deploy. Note the service URL, e.g. `https://diwali-photos-api.onrender.com`. Open `<url>/health`
   and confirm `"drive": "configured"` and a photo count.

### 3.3 Frontend on GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and publishes `frontend/` on every push to `main`.

1. Repo **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. Repo **Settings > Secrets and variables > Actions > Variables > New repository variable**:
   `VITE_API_BASE_URL` = your Render URL (no trailing slash).
3. Push (or **Actions > Deploy frontend to GitHub Pages > Run workflow**).
4. The site is live at **https://ikgagan.github.io/diwali2026/** after a minute or two.

The repo name is baked into the site path. If you rename the repo, the workflow picks the new name up
automatically; for local builds set `VITE_BASE_PATH=/<new-name>/`.

### 3.4 Keep the backend awake during the party

Render free services sleep after 15 minutes without traffic and need about a minute to wake. The site
shows a "waking up the diyas" loader and retries by itself, but to avoid it on the night:

1. Create a free https://uptimerobot.com monitor: HTTP(s), URL `<Render URL>/health`, interval 5 minutes.
2. Open the gallery yourself a few minutes before guests arrive.

---

## 4. Pre-event checklist (14 Nov 2026, 7 PM)

- [ ] Refresh token generated on 12 or 13 Nov (or consent screen set to In production).
- [ ] Render shows `"drive": "configured"` at `/health`; test upload from the live site works.
- [ ] Upload tested on **iPhone (Safari)** with a HEIC photo, **Android (Chrome)**, **Windows (Chrome/Edge)**, several photos at once.
- [ ] Gallery shows photos, lightbox opens, countdown ticks, set changes at the 20-minute mark.
- [ ] Drive folder opened in an incognito window asks for access.
- [ ] Copy-link buttons work on a phone.
- [ ] Location page: map centres on Katriguppe, tap-to-call works for all three numbers, WhatsApp link opens.
- [ ] `/admin` page unlocks with `ADMIN_TOKEN` and can delete a test photo.
- [ ] UptimeRobot monitor running; backend woken just before 7 PM.
- [ ] Spot-check Drive storage (Google One / Drive storage page).
- [ ] Passcode printed on a card or shared in the group chat.

---

## 5. Day-to-day

- **Change wording, phone numbers, links**: `frontend/src/config/siteConfig.js`, then push.
- **Change colours or fonts**: the `@theme` block at the top of `frontend/src/index.css`.
- **Delete a photo**: open `https://ikgagan.github.io/diwali2026/admin`, paste `ADMIN_TOKEN`, click the bin icon.
  Deleting removes the original, medium and thumbnail from Drive. While unlocked on that device, the gallery
  lightbox also shows a Delete button.
- **Rotation interval**: `GALLERY_ROTATE_MINUTES` on Render (15 to 20 recommended).

---

## 6. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Upload says *Google refused the refresh token* / `invalid_grant` | Testing-mode token expired (7 days) or access revoked. Re-run `get_refresh_token.py`, update `GOOGLE_REFRESH_TOKEN` on Render, redeploy. |
| `storageQuotaExceeded` | Drive is full (15 GB shared with Gmail and Photos), or you used a service account (do not). Free space or use another account. |
| Browser console shows a CORS error | `CORS_ORIGINS` on Render must contain exactly `https://ikgagan.github.io` (scheme, no path, no trailing slash). Redeploy after changing. |
| HEIC photo rejected or shows as broken | The backend converts HEIC with pillow-heif; check Render build logs that `pillow-heif` installed. Browsers never receive HEIC, only JPEG. |
| First load takes a minute / "waking up the diyas" | Render cold start. Set up the UptimeRobot ping (section 3.4). |
| Gallery empty although Drive has photos | Only photos with all three files (original, `medium/`, `thumbs/`) are shown. Files dropped straight into Drive are ignored. Use `/admin` > Rebuild from Drive after manual changes. |
| Deep link like `/gallery` gives GitHub's 404 page | The build copies `index.html` to `404.html` so GitHub Pages falls back to the app. Make sure the Pages source is "GitHub Actions", not a branch. |
| Render `/health` shows `"drive": "not configured"` | One of `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `DRIVE_FOLDER_ID` is missing on Render. |
| Uploads return 429 | Rate limit (30 per minute per IP by default). Raise `UPLOAD_RATE_LIMIT`, e.g. `60/minute`, if many guests share one Wi-Fi IP. |

---

## 7. How it works

- **Upload** (`POST /api/upload`, one file per request, `X-Event-Passcode` header): the backend sniffs the
  real image type, applies EXIF rotation, writes a 1600 px medium JPEG and a 400 px thumbnail, and uploads
  original + medium + thumb to Drive with `appProperties` tags. Files are processed one at a time to stay
  inside Render's 512 MB.
- **Gallery** (`GET /api/gallery`): an in-memory index (rebuilt from Drive at start and every 60 s) is
  shuffled once per full cycle with a seed derived from the clock, then paged 10 at a time per
  20-minute window. Every guest gets the same 10 photos, and every photo appears before any repeats.
- **Images** (`GET /api/photos/{id}/thumb|medium`): streamed from Drive through the backend with a small
  LRU cache and `Cache-Control: immutable`, so browsers and phones never fetch the multi-megabyte originals.
- **Admin** (`/api/admin/*`, `X-Admin-Token` header): list, delete, rebuild index. Disabled when
  `ADMIN_TOKEN` is empty.
