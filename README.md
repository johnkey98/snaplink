# 🔗 SnapLink — URL Shortener with Real Analytics

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![No build step](https://img.shields.io/badge/frontend-vanilla%20JS-f7df1e)

SnapLink is a complete URL shortening service in a single Express process: create short links with **custom aliases** and **expiry dates**, share them, and watch a **live analytics dashboard** — clicks per day (Chart.js), top referrers, browser breakdown, and QR codes generated for every link.

Unlike most shortener demos, SnapLink tracks and stores click metadata (timestamp, referrer, user-agent) server-side, computes aggregates with pure functions, and exposes it all through a clean REST API. The frontend is dependency-free vanilla JS — no build step, no framework — served statically by the same server that handles redirects.

<!-- 📸 Add screenshots here, e.g.: ![Dashboard](screenshots/analytics.png) -->

## ✨ Features

- **Shorten with confidence** — strict URL validation (`http/https` only), collision-safe 7-char base62 codes.
- **Custom aliases** — `yourdomain.com/launch-2026`, validated `[a-zA-Z0-9_-]{3,30}` with reserved-word protection.
- **Expiry support** — optional TTL in days; expired links return HTTP `410 Gone`.
- **Click analytics** — per-day time series, top referrers, browser detection (Chrome/Firefox/Safari/Edge).
- **QR codes** — auto-generated for every created link.
- **Management API** — list, inspect stats, delete links.
- **Atomic persistence** — JSON store with tmp-file + rename writes, survives restarts.

## 🚀 Getting Started

```bash
git clone https://github.com/johnkey98/snaplink.git
cd snaplink
npm install
npm run dev        # → http://localhost:3000
```

That's it — no env vars, no database, no build step.

## 📡 API Reference

| Method | Endpoint                  | Description                                     |
| ------ | ------------------------- | ----------------------------------------------- |
| GET    | `/api/health`             | Heartbeat + total link count                    |
| POST   | `/api/links`              | `{ url, alias?, expiresInDays? }` → short link  |
| GET    | `/api/links`              | All links, newest first, with click counts      |
| GET    | `/api/links/:code/stats`  | Full analytics for one link                     |
| DELETE | `/api/links/:code`        | Delete a link                                   |
| GET    | `/:code`                  | Redirect + record click (302)                   |

### Examples

```bash
# Create a short link with custom alias
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/johnkey98", "alias":"my-github"}'
# → { "shortUrl": "http://localhost:3000/my-github", ... }

# Inspect analytics
curl http://localhost:3000/api/links/my-github/stats
```

## 📂 Project Structure

```
snaplink/
├── server.js           # Express: API + redirect engine + static
├── src/
│   ├── db.js           # Atomic JSON-file store
│   └── shortener.js    # Code gen, validation, click aggregation
└── public/
    ├── index.html      # Dashboard UI
    ├── style.css       # Dark glass theme
    └── app.js          # Vanilla JS client + Chart.js
```

## 🧠 Design Notes

- **Server-side truth** — redirect counts are written before the `302` is returned, so numbers can never drift from reality.
- **Pure aggregation** — `statsFor()` derives all analytics from raw click records, making it trivial to swap in SQL later.
- **Reserved aliases** — `api`, `qr`, `assets`, `health` are protected so short codes can never shadow service routes.

## 🗺 Roadmap

- [ ] Password-protected links
- [ ] Geo/IP analytics
- [ ] SQLite storage adapter
- [ ] Dockerfile

## 📄 License

[MIT](LICENSE) © [John Key](https://github.com/johnkey98)
