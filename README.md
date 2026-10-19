# VetVoice - Voice-to-Structured-Fields for Veterinary Records

Speak or paste a visit note -> AI turns it into editable veterinary fields -> you review, fix, validate and save to PostgreSQL.

| Part | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Django + Django REST Framework |
| Database | PostgreSQL |
| Speech-to-text | OpenAI `whisper-1` (change in `.env`) |
| Field extraction | OpenAI `gpt-4o-mini` (change in `.env`) |

One OpenAI API key (stored only in `backend/.env`) powers both speech-to-text and extraction. The browser never sees it.

## How it avoids invented data
1. The prompt forces: "only what is stated, otherwise null". Missing fields stay empty ("Not mentioned").
2. The AI must give an exact quote from the note for every value. The backend checks the quote really exists in the note.
3. The backend also checks numbers (weight), phone numbers, microchip IDs and emails against the original text.
4. Anything unverified or unclear is **flagged** (amber "Review"). A record cannot be marked **Validated** until every flag is reviewed (edit the field or click "Looks correct").
5. Output is forced into a strict schema; invalid values (e.g. sex = "boy") are dropped.

---

## 1. Install the tools (one time, Windows)
1. **VS Code**: https://code.visualstudio.com (install the *Python* extension).
2. **Python 3.11 or 3.12**: https://www.python.org/downloads - tick **"Add python.exe to PATH"** during install.
3. **Node.js LTS (20 or newer)**: https://nodejs.org
4. **PostgreSQL 15 or 16**: https://www.postgresql.org/download/windows - remember the password you set for the `postgres` user. Keep port 5432.
5. **OpenAI API key**: https://platform.openai.com/api-keys (billing must be enabled; usage costs a few cents per note).

Check in a new VS Code terminal (`Ctrl + ~`):
```powershell
python --version
node --version
```

## 2. Create the database
Open **SQL Shell (psql)** from the Start menu (press Enter for defaults, then type your password) and run:
```sql
CREATE DATABASE vetvoice;
\q
```
(You can also create `vetvoice` in pgAdmin: right-click Databases -> Create -> Database.)

## 3. Start the backend (Terminal 1)
In VS Code: **File -> Open Folder** -> choose the `vet-voice-app` folder. Open a terminal (PowerShell):
```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
```
If PowerShell blocks the activate script, run this once, then activate again:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

```powershell
pip install -r requirements.txt
copy .env.example .env
code .env
```
Edit `.env`: set `OPENAI_API_KEY` and `DB_PASSWORD` (your postgres password). Save. Then:
```powershell
python manage.py makemigrations records
python manage.py migrate
python manage.py load_samples
python manage.py runserver
```
Leave it running. Backend is at http://127.0.0.1:8000.

## 4. Start the frontend (Terminal 2)
Click the **+** in the VS Code terminal panel to open a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in Chrome or Edge.

---

## 5. Test it step by step
**Test 0 - health check.** Visit http://127.0.0.1:8000/api/health/ . You should see `"database": true` and `"openai_key_configured": true`. The app also shows a warning banner at the top if something is wrong.

**Test 1 - text.** In the app choose **Try a sample note -> Dog - vomiting**, press **Extract fields**. Fields fill in (Bella, Labrador, 28 kg, ondansetron...). Edit anything, then **Save draft**.

**Test 2 - uncertain data.** Load **Cat - vague note**. Whiskers' age, sex, diagnosis and amoxicillin dose are flagged; weight stays empty. Try **Validate and save** - it is refused until you review the flags. Click **Looks correct** (or edit) on each, then validate.

**Test 3 - voice.** Click **Record voice**, allow the microphone, read this aloud, then **Stop recording**:
> "Patient is Max, a five year old neutered male German Shepherd, weight 32 kilograms. Owner is Arun Kumar, phone 9 8 4 5 0 1 2 3 4 5. Max has been limping on the right hind leg for three days. X-ray ordered. Started meloxicam 1.5 mg once daily with food for five days. Recheck in one week."

The text appears in the box and (by default) fields are extracted automatically. You can also **Upload audio file** (webm, mp3, m4a, wav, ogg).

**Test 4 - saved data.** Open the **Saved records** tab: search, open, edit, delete. To see rows in PostgreSQL: pgAdmin -> vetvoice -> Tables -> `records_vetrecord` -> View Data. Optional admin site: `python manage.py createsuperuser` then http://127.0.0.1:8000/admin/ .

**Test 5 - automated tests** (Terminal 1, stop the server with Ctrl+C first or use a third terminal with venv activated):
```powershell
python manage.py test
```
(Needs the Postgres user to be allowed to create a test database - the default `postgres` user can.)

---

## API endpoints
| Method | URL | Purpose |
|---|---|---|
| GET | `/api/health/` | Database + API-key check |
| GET | `/api/samples/` | Example notes |
| POST | `/api/transcribe/` | Multipart `audio` file -> `{"text": "..."}` |
| POST | `/api/extract/` | `{"text": "...", "source": "text\|voice"}` -> `fields`, `flagged_fields`, `evidence` |
| GET, POST | `/api/records/` | List (`?search=`, `?status=`) / create |
| GET, PUT, PATCH, DELETE | `/api/records/<id>/` | Read / update / delete |

## Project layout
```
backend/   config/ (settings, urls)   records/ (models, serializers, views, ai_services.py, tests.py)
frontend/  src/ (App.jsx, api.js, fields.js, components/, styles.css)
```
Want a different AI provider? Only `backend/records/ai_services.py` needs to change.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Cannot reach the backend" | Terminal 1 must be running `python manage.py runserver`. |
| "cannot connect to PostgreSQL" / `password authentication failed` | Check `DB_*` values in `backend/.env`; make sure the PostgreSQL service is running and database `vetvoice` exists. |
| "OpenAI rejected the API key" | Re-copy the key into `.env` (no quotes/spaces), restart Django. |
| Quota / rate-limit message | Add billing credit in your OpenAI account. |
| Microphone blocked | Click the lock icon in the address bar -> allow microphone. Use `localhost` (not an IP address). |
| `psycopg2` install error | Use Python 3.11/3.12 and run `pip install --upgrade pip` first. |
| Changed `.env` but nothing happened | Stop (Ctrl+C) and restart `runserver`. |
| Changed models | `python manage.py makemigrations records` then `python manage.py migrate`. |

## Important notes
- This is a local development setup. Before using real patient data in production, add user login, HTTPS, backups and review OpenAI's data-handling terms - note text and audio are sent to OpenAI.
- AI can make mistakes. The review/flag workflow exists so a veterinarian always has the final say.
