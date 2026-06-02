const historyTableBody = document.querySelector('#history-table tbody');

async function fetchHistory() {
  const response = await fetch('/api/history');
  if (!response.ok) throw new Error('Unable to load history records.');
  const payload = await response.json();
  return Array.isArray(payload.history) ? payload.history : [];
}

function renderHistory(records) {
  historyTableBody.innerHTML = records.length
    ? records
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(
          (record) => `
          <tr>
            <td>${new Date(record.date).toLocaleString()}</td>
            <td>${record.action}</td>
            <td>${record.details || '-'}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="empty-state">No history items have been recorded yet.</td></tr>';
}

async function initHistory() {
  try {
    const records = await fetchHistory();
    renderHistory(records);
  } catch (error) {
    historyTableBody.innerHTML = `<tr><td colspan="3" class="empty-state">${error.message}</td></tr>`;
  }
}

window.addEventListener('load', initHistory);
