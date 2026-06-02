const walletTableBody = document.querySelector('#wallet-table tbody');
const walletBalance = document.getElementById('wallet-balance');
const walletTotalIn = document.getElementById('wallet-total-in');
const walletTotalOut = document.getElementById('wallet-total-out');
const walletAddButton = document.getElementById('wallet-add-button');
const walletModal = document.getElementById('wallet-modal');
const walletModalClose = document.getElementById('wallet-modal-close');
const walletCancel = document.getElementById('wallet-cancel');
const walletForm = document.getElementById('wallet-form');
const walletError = document.getElementById('wallet-error');
const walletDescription = document.getElementById('wallet-description');
const walletAmount = document.getElementById('wallet-amount');
const walletType = document.getElementById('wallet-type');
const walletChartCanvas = document.getElementById('wallet-chart');
let walletRecords = [];
let walletChart;

function setModalVisible(visible) {
  walletModal.classList.toggle('hidden', !visible);
}

function setError(message) {
  if (!message) {
    walletError.classList.add('hidden');
    walletError.textContent = '';
    return;
  }
  walletError.classList.remove('hidden');
  walletError.textContent = message;
}

async function fetchWallet() {
  const response = await fetch('/api/wallet');
  if (!response.ok) throw new Error('Unable to load wallet transactions.');
  const data = await response.json();
  walletRecords = Array.isArray(data.transactions) ? data.transactions : [];
}

function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(Number(value));
  } catch (e) {
    return `Rs ${Number(value).toFixed(2)}`;
  }
}

function renderWallet() {
  const totalIn = walletRecords.filter((entry) => entry.type === 'deposit').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalOut = walletRecords.filter((entry) => entry.type === 'withdrawal').reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIn - totalOut;
  walletBalance.textContent = formatCurrency(balance);
  walletTotalIn.textContent = formatCurrency(totalIn);
  walletTotalOut.textContent = formatCurrency(totalOut);
  walletTableBody.innerHTML = walletRecords.length
    ? walletRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(
          (entry) => `
          <tr>
            <td>${new Date(entry.date).toLocaleDateString()}</td>
            <td>${entry.description}</td>
            <td>${entry.type}</td>
            <td>${formatCurrency(entry.amount)}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="4" class="empty-state">No wallet transactions recorded yet.</td></tr>';
  renderChart(totalIn, totalOut);
}

function renderChart(totalIn, totalOut) {
  const chartData = {
    labels: ['Deposits', 'Withdrawals'],
    datasets: [
      {
        data: [totalIn, totalOut],
        backgroundColor: ['#3dd598', '#e35d6a'],
      },
    ],
  };
  const config = {
    type: 'pie',
    data: chartData,
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  };
  if (walletChart) {
    walletChart.data = chartData;
    walletChart.update();
    return;
  }
  walletChart = new Chart(walletChartCanvas, config);
}

async function submitWallet(event) {
  event.preventDefault();
  const description = walletDescription.value.trim();
  const amount = Number(walletAmount.value);
  const type = walletType.value;
  if (!description || !amount || amount <= 0) {
    setError('Please add a valid description and amount.');
    return;
  }
  try {
    const token = sessionStorage.getItem('stockflow_token');
    const response = await fetch('/api/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ description, amount, type }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Unable to add transaction.');
    }
    walletForm.reset();
    setModalVisible(false);
    await loadWallet();
  } catch (error) {
    setError(error.message);
  }
}

async function loadWallet() {
  try {
    await fetchWallet();
    renderWallet();
  } catch (error) {
    walletTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${error.message}</td></tr>`;
  }
}

function initialize() {
  walletAddButton.addEventListener('click', () => {
    setError('');
    walletForm.reset();
    setModalVisible(true);
  });
  walletModalClose.addEventListener('click', () => setModalVisible(false));
  walletCancel.addEventListener('click', () => setModalVisible(false));
  walletModal.addEventListener('click', (event) => {
    if (event.target === walletModal) setModalVisible(false);
  });
  walletForm.addEventListener('submit', submitWallet);
  loadWallet();
}

initialize();
