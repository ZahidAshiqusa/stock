const clippingTableBody = document.querySelector('#clipping-table tbody');
const clippingAddButton = document.getElementById('clipping-add-button');
const clippingModal = document.getElementById('clipping-modal');
const clippingModalClose = document.getElementById('clipping-modal-close');
const clippingCancel = document.getElementById('clipping-cancel');
const clippingForm = document.getElementById('clipping-form');
const clippingError = document.getElementById('clipping-error');
const clippingTitle = document.getElementById('clipping-title');
const clippingCategory = document.getElementById('clipping-category');
const clippingNote = document.getElementById('clipping-note');
let clippingRecords = [];

function toggleModal(open) {
  clippingModal.classList.toggle('hidden', !open);
}

function setError(message) {
  if (!message) {
    clippingError.classList.add('hidden');
    clippingError.textContent = '';
    return;
  }
  clippingError.classList.remove('hidden');
  clippingError.textContent = message;
}

async function fetchClippings() {
  const response = await fetch('/api/clipping');
  if (!response.ok) throw new Error('Unable to load clipping records.');
  const payload = await response.json();
  clippingRecords = Array.isArray(payload.records) ? payload.records : [];
}

function renderClippings() {
  clippingTableBody.innerHTML = clippingRecords.length
    ? clippingRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(
          (record) => `
          <tr>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.title}</td>
            <td>${record.category}</td>
            <td>${record.note}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="4" class="empty-state">No clipping records found.</td></tr>';
}

async function submitClipping(event) {
  event.preventDefault();
  const title = clippingTitle.value.trim();
  const category = clippingCategory.value;
  const note = clippingNote.value.trim();
  if (!title || !note) {
    setError('Please provide a title and a note.');
    return;
  }
  try {
    const token = sessionStorage.getItem('stockflow_token');
    const response = await fetch('/api/clipping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ title, category, note }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Unable to save clipping.');
    }
    clippingForm.reset();
    setError('');
    toggleModal(false);
    await loadClippings();
  } catch (error) {
    setError(error.message);
  }
}

async function loadClippings() {
  try {
    await fetchClippings();
    renderClippings();
  } catch (error) {
    clippingTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${error.message}</td></tr>`;
  }
}

function initialize() {
  clippingAddButton.addEventListener('click', () => {
    clippingForm.reset();
    setError('');
    toggleModal(true);
  });
  clippingModalClose.addEventListener('click', () => toggleModal(false));
  clippingCancel.addEventListener('click', () => toggleModal(false));
  clippingModal.addEventListener('click', (event) => {
    if (event.target === clippingModal) toggleModal(false);
  });
  clippingForm.addEventListener('submit', submitClipping);
  loadClippings();
}

initialize();
