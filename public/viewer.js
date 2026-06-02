const SEARCH_INPUT = document.getElementById('viewer-search');
const CATEGORY_SELECT = document.getElementById('viewer-category');
const TABLE_BODY = document.querySelector('#viewer-table tbody');
const CHART_CANVAS = document.getElementById('viewer-chart');
const STATUS_ORDER = ['Available', 'In Use', 'Installed', 'Reserved', 'Defective'];
const LOW_STOCK_THRESHOLD = 5;
let inventory = [];
let chartInstance;

async function fetchInventory() {
  const response = await fetch('/api/items');
  if (!response.ok) throw new Error('Unable to load inventory.');
  const payload = await response.json();
  inventory = Array.isArray(payload.items) ? payload.items : [];
}

function getFilteredItems() {
  const term = SEARCH_INPUT.value.trim().toLowerCase();
  const category = CATEGORY_SELECT.value;
  return inventory.filter((item) => {
    const matches = [item.name, item.serial].some((field) => field.toLowerCase().includes(term));
    if (!matches) return false;
    if (category === 'All Items') return true;
    if (category === 'Low Stock') return Number(item.quantity) <= LOW_STOCK_THRESHOLD;
    return item.status === category;
  });
}

function renderTable() {
  const filtered = getFilteredItems();
  if (!filtered.length) {
    TABLE_BODY.innerHTML = '<tr><td colspan="4" class="empty-state">No matching items found.</td></tr>';
    return;
  }
  TABLE_BODY.innerHTML = filtered
    .map((item) => {
      const danger = Number(item.quantity) <= LOW_STOCK_THRESHOLD ? 'low-stock' : '';
      return `
      <tr>
        <td>${item.name}</td>
        <td>${item.serial}</td>
        <td class="${danger}">${item.quantity}</td>
        <td>${item.status}</td>
      </tr>`;
    })
    .join('');
}

function renderChart() {
  const counts = STATUS_ORDER.map((status) => inventory.filter((item) => item.status === status).length);
  const config = {
    type: 'bar',
    data: {
      labels: STATUS_ORDER,
      datasets: [{ label: 'Items by status', data: counts, backgroundColor: ['#2d6cdf', '#3dd598', '#f3a12c', '#5f4bff', '#e35d6a'] }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, precision: 0 } },
    },
  };
  if (chartInstance) {
    chartInstance.data = config.data;
    chartInstance.update();
    return;
  }
  chartInstance = new Chart(CHART_CANVAS, config);
}

async function initViewer() {
  try {
    await fetchInventory();
    renderTable();
    renderChart();
  } catch (error) {
    TABLE_BODY.innerHTML = `<tr><td colspan="4" class="empty-state">${error.message}</td></tr>`;
  }
}

SEARCH_INPUT.addEventListener('input', renderTable);
CATEGORY_SELECT.addEventListener('change', renderTable);
window.addEventListener('load', initViewer);
