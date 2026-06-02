const STATUSES = ['Available', 'In Use', 'Installed', 'Reserved', 'Defective'];
const LOW_STOCK_THRESHOLD = 5;

const loginScreen = document.getElementById('login-screen');
const adminApp = document.getElementById('admin-app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const passwordInput = document.getElementById('admin-password');
const logoutButton = document.getElementById('logout-button');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const newItemButton = document.getElementById('new-item-button');
const manageSampleButton = document.getElementById('manage-sample-button');
const statsCards = document.getElementById('stats-cards');
const itemCountLabel = document.getElementById('item-count');
const itemsTableBody = document.querySelector('#items-table tbody');
const statusChartCanvas = document.getElementById('status-chart');
const itemModal = document.getElementById('item-modal');
const modalTitle = document.getElementById('modal-title');
const itemForm = document.getElementById('item-form');
const modalClose = document.getElementById('modal-close');
const cancelButton = document.getElementById('cancel-button');
const itemError = document.getElementById('item-error');
const itemIdInput = document.getElementById('item-id');
const itemNameInput = document.getElementById('item-name');
const itemSerialInput = document.getElementById('item-serial');
const itemQuantityInput = document.getElementById('item-quantity');
const itemStatusSelect = document.getElementById('item-status');

let items = [];
let chartInstance;

function getToken() {
  return sessionStorage.getItem('stockflow_token');
}

function setToken(token) {
  sessionStorage.setItem('stockflow_token', token);
}

function clearToken() {
  sessionStorage.removeItem('stockflow_token');
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  adminApp.classList.add('hidden');
}

function showApp() {
  loginScreen.classList.add('hidden');
  adminApp.classList.remove('hidden');
}

function setError(element, message) {
  if (!message) {
    element.classList.add('hidden');
    element.textContent = '';
    return;
  }
  element.classList.remove('hidden');
  element.textContent = message;
}

async function apiRequest(method, path, data = null, query = {}) {
  const token = getToken();
  const params = new URLSearchParams(query).toString();
  const url = `${path}${params ? `?${params}` : ''}`;
  const options = { method, headers: {} };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || response.statusText || 'Request failed');
  }
  return response.json();
}

async function login(password) {
  const payload = await apiRequest('POST', '/api/login', { password });
  setToken(payload.token);
  showApp();
  await loadItems();
}

async function loadItems() {
  try {
    const response = await apiRequest('GET', '/api/items');
    items = Array.isArray(response.items) ? response.items : [];
    renderStats();
    renderItems();
  } catch (error) {
    showLogin();
    setError(loginError, 'Session expired or unauthorized. Please log in again.');
    clearToken();
  }
}

function buildStats(itemsList) {
  const totals = {
    'All Items': itemsList.length,
    Available: itemsList.filter((item) => item.status === 'Available').length,
    'In Use': itemsList.filter((item) => item.status === 'In Use').length,
    Installed: itemsList.filter((item) => item.status === 'Installed').length,
    Reserved: itemsList.filter((item) => item.status === 'Reserved').length,
    Defective: itemsList.filter((item) => item.status === 'Defective').length,
    'Low Stock': itemsList.filter((item) => Number(item.quantity) <= LOW_STOCK_THRESHOLD).length,
  };
  return totals;
}

function renderStats() {
  const totals = buildStats(items);
  statsCards.innerHTML = Object.entries(totals)
    .map(
      ([label, value]) => `
      <div class="card stat-card">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>`
    )
    .join('');
  renderChart(totals);
}

function renderChart(totals) {
  const labels = STATUSES;
  const data = labels.map((status) => totals[status] || 0);
  const config = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ['#2d6cdf', '#3dd598', '#f3a12c', '#5f4bff', '#e35d6a'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  };
  if (chartInstance) {
    chartInstance.data = config.data;
    chartInstance.update();
    return;
  }
  chartInstance = new Chart(statusChartCanvas, config);
}

function filterInventory() {
  const term = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  return items.filter((item) => {
    const matchesSearch = [item.name, item.serial].some((field) => field.toLowerCase().includes(term));
    if (!matchesSearch) return false;
    if (category === 'All Items') return true;
    if (category === 'Low Stock') return Number(item.quantity) <= LOW_STOCK_THRESHOLD;
    return item.status === category;
  });
}

function renderItems() {
  const filtered = filterInventory();
  itemCountLabel.textContent = `${filtered.length} items found`;
  if (!filtered.length) {
    itemsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No inventory items match your search.</td></tr>';
    return;
  }
  itemsTableBody.innerHTML = filtered
    .map((item) => {
      const lowStock = Number(item.quantity) <= LOW_STOCK_THRESHOLD ? 'low-stock' : '';
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.serial}</td>
          <td class="${lowStock}">${item.quantity}</td>
          <td><button class="status-badge badge ${item.status.toLowerCase().replace(/\s/g, '-')}">${item.status}</button></td>
          <td>
            <button class="button button-mini" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="button button-mini button-danger" data-action="delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>`;
    })
    .join('');
}

function openModal(editItem = null) {
  itemModal.classList.remove('hidden');
  if (editItem) {
    modalTitle.textContent = 'Edit inventory item';
    itemIdInput.value = editItem.id;
    itemNameInput.value = editItem.name;
    itemSerialInput.value = editItem.serial;
    itemQuantityInput.value = editItem.quantity;
    itemStatusSelect.value = editItem.status;
  } else {
    modalTitle.textContent = 'Add inventory item';
    itemForm.reset();
    itemIdInput.value = '';
  }
  setError(itemError, '');
}

function closeModal() {
  itemModal.classList.add('hidden');
}

async function saveItem(event) {
  event.preventDefault();
  const payload = {
    name: itemNameInput.value.trim(),
    serial: itemSerialInput.value.trim(),
    quantity: Number(itemQuantityInput.value),
    status: itemStatusSelect.value,
  };
  if (!payload.name || !payload.serial || Number.isNaN(payload.quantity)) {
    setError(itemError, 'Please complete all fields before saving.');
    return;
  }
  const id = itemIdInput.value;
  try {
    if (id) {
      payload.id = id;
      await apiRequest('PUT', '/api/items', payload);
    } else {
      await apiRequest('POST', '/api/items', payload);
    }
    await loadItems();
    closeModal();
  } catch (error) {
    setError(itemError, error.message);
  }
}

async function manageSampleFlow() {
  if (!getToken()) {
    alert('Please sign in as admin to manage samples.');
    return;
  }
  const dir = (prompt('Enter sample direction: "in" or "out"') || '').trim().toLowerCase();
  if (!dir || (dir !== 'in' && dir !== 'out')) {
    alert('Invalid direction. Use "in" or "out".');
    return;
  }
  const name = (prompt('Enter sample name') || '').trim();
  if (!name) {
    alert('Name is required.');
    return;
  }
  const widthRaw = (prompt('Enter width in guzz (numeric)') || '').trim();
  const width = Number(widthRaw);
  if (!widthRaw || Number.isNaN(width)) {
    alert('Width must be a number.');
    return;
  }
  try {
    await apiRequest('POST', '/api/samples', { direction: dir, name, width });
    alert('Sample recorded.');
    // reload items/stats if needed
    await loadItems().catch(() => {});
  } catch (err) {
    alert(err.message);
  }
}

async function changeItemStatus(itemId) {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return;
  const currentIndex = STATUSES.indexOf(item.status);
  const nextStatus = STATUSES[(currentIndex + 1) % STATUSES.length];
  try {
    await apiRequest('PUT', '/api/items', { id: item.id, status: nextStatus });
    await loadItems();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteItem(itemId) {
  if (!confirm('Delete this item permanently?')) return;
  try {
    await apiRequest('DELETE', '/api/items', null, { id: itemId });
    await loadItems();
  } catch (error) {
    alert(error.message);
  }
}

function handleTableClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (button.classList.contains('status-badge')) {
    const row = button.closest('tr');
    const itemId = row.querySelector('[data-id]')?.dataset.id || id;
    return changeItemStatus(itemId);
  }
  if (action === 'edit') {
    const item = items.find((entry) => entry.id === id);
    if (item) openModal(item);
  }
  if (action === 'delete') {
    deleteItem(id);
  }
}

function initialize() {
  const currentToken = getToken();
  if (currentToken) {
    showApp();
    loadItems();
  } else {
    showLogin();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(loginError, '');
    try {
      await login(passwordInput.value.trim());
      passwordInput.value = '';
    } catch (error) {
      setError(loginError, error.message);
    }
  });

  logoutButton.addEventListener('click', () => {
    clearToken();
    showLogin();
  });

  searchInput.addEventListener('input', renderItems);
  categorySelect.addEventListener('change', renderItems);
  newItemButton.addEventListener('click', () => openModal());
  manageSampleButton.addEventListener('click', manageSampleFlow);
  modalClose.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  itemForm.addEventListener('submit', saveItem);
  itemsTableBody.addEventListener('click', handleTableClick);
  itemModal.addEventListener('click', (event) => {
    if (event.target === itemModal) closeModal();
  });
}

initialize();
