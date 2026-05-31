# CheckCheckDoubleCheck — HomeCare scope-check

A small, standalone throwaway tool. It serves the HomeCare scope-check as an
online form behind a **unique link per person**. On submit, the answers are
stored on the server as one file per person and **that link stops working**.
A protected status page shows who opened their link and who submitted.

It stands completely apart from CCDC and HomeCare. No database — answers are
stored as JSON files on disk.

> This app also serves the existing static `checkcheckdoublecheck.com` homepage
> (`index.html`, `styles.css`, `assets/`, `fonts/`) so the whole site can run
> from one place. Those static files are untouched.

---

## What's in here

```
checkcheckdoublecheck/
├── server.js                  # the Express app (all routes)
├── package.json
├── lib/
│   └── areas.js               # the 9 areas + intake fields (single source of truth)
├── views/
│   ├── form.html              # the scope-check form (role/name locked from token)
│   ├── already.html           # "this link is already used"
│   ├── thanks.html            # shown after submit
│   ├── notfound.html          # unknown token / 404
│   ├── badrequest.html        # malformed submit
│   ├── admin.html             # status overview
│   └── response.html          # one person's answers (admin)
├── scripts/
│   └── setup.js               # generate config.json + print the links
├── config.example.json        # shape of config.json (committed)
├── config.json                # tokens — generated, NOT in git
├── data/responses/            # one <role>.json per person — NOT in git
├── deploy/
│   ├── checkcheckdoublecheck.service   # example systemd unit
│   └── nginx.conf                       # example nginx server block
│
├── index.html  styles.css  assets/  fonts/  CNAME   # existing static site (untouched)
└── homecare-scope-check.html  # original source form (kept for reference)
```

---

## Routes

| Method & path | Behaviour |
|---|---|
| `GET /f/:token` | Valid & not yet submitted: serve the form with the role/name filled from the token, and log `openedAt` if still empty. Already submitted: a tidy "this link is already used" page. Unknown token: a 404 page. |
| `POST /f/:token` | Store the answers in that person's file, set `submittedAt`, lock the token, show a thank-you page. After that both `GET` and `POST` on the link are refused. |
| `GET /admin/:adminToken` | Protected status page. Per person: name, role, status (*nog niet geopend* / *geopend op …* / *ingediend op …*) and links to view and download the answers. |
| `GET /admin/:adminToken/r/:role` | View one person's submitted answers. |
| `GET /admin/:adminToken/r/:role/download` | Download that person's answers as a `.json` file. |
| `GET /` etc. | The existing static homepage. |

Each person's answers live in their own file (`data/responses/kian.json`,
`data/responses/santi.json`) so two people can never overwrite each other.
A stored file looks like:

```json
{
  "token": "…",
  "name": "Kian",
  "role": "Kian",
  "openedAt": "2026-05-31T14:02:11.000Z",
  "submittedAt": "2026-05-31T14:31:55.000Z",
  "answers": { "items": { "0_0": { "status": "live", "note": "" } }, "meta": { "…": "…" } }
}
```

---

## Run it locally

```bash
npm install
npm run setup     # creates config.json with random tokens, prints the links
npm start         # starts on http://localhost:8090
```

`npm run setup` prints the two personal links and the admin link. To print them
again later without regenerating:

```bash
npm run links
```

By default the printed links use `https://checkcheckdoublecheck.com`. For local
testing, point them at localhost:

```bash
PUBLIC_BASE_URL=http://localhost:8090 npm run links
```

### Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8090` | Port the app listens on. |
| `PUBLIC_BASE_URL` | `https://checkcheckdoublecheck.com` | Base URL used when **printing** links. |
| `CONFIG_PATH` | `./config.json` | Where the tokens live. |
| `DATA_DIR` | `./data/responses` | Where the per-person answer files are written. |
| `ADMIN_TOKEN`, `KIAN_TOKEN`, `SANTI_TOKEN` | — | Optional: provide tokens via env instead of `config.json`. If all three are set they take precedence. |

Tokens are **never** committed: `config.json`, `data/`, `node_modules/` and
`*.tmp` are all in `.gitignore`.

---

## Deploy to Hetzner (do this on the server — not done for you)

1. **Get the code on the server** (e.g. under `/opt/checkcheckdoublecheck`) and install:
   ```bash
   cd /opt/checkcheckdoublecheck
   npm install --omit=dev
   npm run setup            # generates config.json + prints the links — save them
   ```
2. **Service**: copy and enable the systemd unit (edit paths/user/port first):
   ```bash
   sudo cp deploy/checkcheckdoublecheck.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now checkcheckdoublecheck
   journalctl -u checkcheckdoublecheck -f
   ```
3. **nginx**: put `deploy/nginx.conf` in `/etc/nginx/sites-available/`, symlink it
   into `sites-enabled/`, then:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d checkcheckdoublecheck.com -d www.checkcheckdoublecheck.com
   ```
   The proxy points `checkcheckdoublecheck.com` at `127.0.0.1:8090` (match `PORT`).

> Note: if `checkcheckdoublecheck.com` currently points at GitHub Pages, switch
> its DNS / `A` record to the Hetzner box so nginx serves it. The `CNAME` file in
> this repo is only relevant to GitHub Pages and is harmless here.

To get the links on the server at any time: `npm run links`.

---

## Reset (start a fresh round)

Delete a person's stored file to re-open their link, or wipe everything:

```bash
rm -f data/responses/*.json      # everyone can open + submit again
```

Generate brand-new links (invalidating the old ones):

```bash
rm config.json && npm run setup
```
