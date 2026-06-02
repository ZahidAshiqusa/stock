const SAMPLES_TABLE_BODY = document.querySelector('#samples-table tbody');

async function fetchSamples() {
  try {
    const res = await fetch('/api/samples');
    if (!res.ok) throw new Error('Failed to load samples');
    const payload = await res.json();
    return Array.isArray(payload.samples) ? payload.samples : [];
  } catch (err) {
    SAMPLES_TABLE_BODY.innerHTML = `<tr><td colspan="4" class="empty-state">${err.message}</td></tr>`;
    return [];
  }
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

async function renderSamples() {
  const samples = await fetchSamples();
  if (!samples.length) {
    SAMPLES_TABLE_BODY.innerHTML = '<tr><td colspan="4" class="empty-state">No samples recorded yet.</td></tr>';
    return;
  }
  SAMPLES_TABLE_BODY.innerHTML = samples
    .map((s) => `
      <tr>
        <td>${s.direction}</td>
        <td>${s.name}</td>
        <td>${s.width}</td>
        <td>${formatTimestamp(s.timestamp)}</td>
      </tr>`)
    .join('');
}

window.addEventListener('load', renderSamples);
