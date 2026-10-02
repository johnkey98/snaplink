/* SnapLink frontend — vanilla JS, no build step */

const $ = (sel) => document.querySelector(sel);
const form = $('#shorten-form');
const listEl = $('#links-list');
let chart = null;

async function api(path, options) {
  const res = await fetch(path, options);
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function showError(message) {
  const el = $('#form-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearError() {
  $('#form-error').classList.add('hidden');
}

/* ---------------- Shorten a URL ---------------- */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const alias = $('#alias').value.trim();
  const expiry = +$('#expiry').value || 0;

  try {
    const created = await api('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: $('#url').value.trim(), alias: alias || undefined, expiresInDays: expiry }),
    });

    $('#result').classList.remove('hidden');
    $('#short-url').textContent = created.shortUrl;
    $('#short-url').href = created.shortUrl;
    $('#dest-url').textContent = created.url;
    $('#qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(created.shortUrl)}`;
    $('#url').value = '';
    $('#alias').value = '';
    $('#expiry').value = '';
    loadLinks();
  } catch (err) {
    showError(err.message);
  }
});

$('#copy-btn').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#short-url').href);
  $('#copy-btn').textContent = 'Copied!';
  setTimeout(() => ($('#copy-btn').textContent = 'Copy'), 1500);
});

/* ---------------- Link list ---------------- */

async function loadLinks() {
  const links = await api('/api/links').catch(() => []);
  const total = links.reduce((s, l) => s + l.clicks, 0);
  $('#total-clicks').textContent = `${links.length} links · ${total} clicks`;

  listEl.innerHTML = '';
  if (links.length === 0) {
    listEl.innerHTML = '<p class="empty">No links yet — shorten your first URL above.</p>';
    return;
  }

  for (const l of links) {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <div class="link-main">
        <a class="link-code" href="/${l.code}" target="_blank" rel="noopener">${location.host}/${l.code}</a>
        <span class="link-url" title="${l.url}">${l.url}</span>
      </div>
      <div class="link-clicks"><b>${l.clicks}</b><span>clicks</span></div>
      <button class="ghost" data-stats="${l.code}">Stats</button>
      <button class="ghost" data-del="${l.code}">✕</button>
    `;
    listEl.appendChild(row);
  }
}

listEl.addEventListener('click', async (e) => {
  const statsCode = e.target.dataset.stats;
  const delCode = e.target.dataset.del;

  if (statsCode) await showStats(statsCode);
  if (delCode) {
    await api(`/api/links/${delCode}`, { method: 'DELETE' });
    loadLinks();
  }
});

/* ---------------- Analytics ---------------- */

async function showStats(code) {
  const s = await api(`/api/links/${code}/stats`);
  $('#stats').classList.remove('hidden');
  $('#stats-code').textContent = code;
  $('#st-total').textContent = s.totalClicks;
  $('#st-refs').textContent = s.topReferrers.length;
  $('#st-created').textContent = new Date(s.createdAt).toLocaleDateString();

  const refEl = $('#referrers');
  refEl.innerHTML = s.topReferrers.length
    ? s.topReferrers
        .map((r) => `<div class="ref-row"><span>${r.name}</span><b>${r.count}</b></div>`)
        .join('')
    : '<p class="empty">No referrer data yet — share the link and clicks will show up here.</p>';

  if (chart) chart.destroy();
  chart = new Chart($('#chart'), {
    type: 'line',
    data: {
      labels: s.byDay.map((d) => d.date.slice(5)),
      datasets: [
        {
          label: 'Clicks per day',
          data: s.byDay.map((d) => d.count),
          borderColor: '#48dbfb',
          backgroundColor: 'rgba(72, 219, 251, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8f93ad' }, grid: { color: '#2a2f4a' } },
        y: { beginAtZero: true, ticks: { color: '#8f93ad', precision: 0 }, grid: { color: '#2a2f4a' } },
      },
    },
  });
  $('#stats').scrollIntoView({ behavior: 'smooth' });
}

$('#stats-close').addEventListener('click', () => $('#stats').classList.add('hidden'));

loadLinks();
