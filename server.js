import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import store from './src/db.js';
import { createLink, resolveLink, recordClick, statsFor } from './src/shortener.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------- API ------------------------- */

app.get('/api/health', (_req, res) => res.json({ status: 'ok', links: Object.keys(store.all()).length }));

/** POST /api/links { url, alias?, expiresInDays? } */
app.post('/api/links', (req, res) => {
  try {
    const link = createLink(req.body || {});
    res.status(201).json({
      code: link.code,
      shortUrl: `${req.protocol}://${req.get('host')}/${link.code}`,
      url: link.url,
      expiresAt: link.expiresAt,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** GET /api/links — all links (newest first), lightweight */
app.get('/api/links', (_req, res) => {
  const links = Object.values(store.all())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((l) => ({
      code: l.code,
      url: l.url,
      createdAt: l.createdAt,
      expiresAt: l.expiresAt,
      clicks: l.clicks.length,
    }));
  res.json(links);
});

/** GET /api/links/:code/stats — full analytics */
app.get('/api/links/:code/stats', (req, res) => {
  const link = store.get(req.params.code);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json(statsFor(link));
});

/** DELETE /api/links/:code */
app.delete('/api/links/:code', (req, res) => {
  if (!store.get(req.params.code)) return res.status(404).json({ error: 'Link not found' });
  store.remove(req.params.code);
  res.status(204).end();
});

/* --------------------- Redirects ---------------------- */

app.get('/:code', (req, res) => {
  const result = resolveLink(req.params.code);
  if (!result) return res.status(404).send('🔗 Link not found.');
  if (result.expired) return res.status(410).send('⏰ This short link has expired.');

  recordClick(result.link, {
    referrer: req.get('referer'),
    userAgent: req.get('user-agent'),
  });
  res.redirect(302, result.link.url);
});

app.listen(PORT, () => {
  console.log(`🔗  SnapLink running on http://localhost:${PORT}`);
});
