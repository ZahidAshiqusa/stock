const ITEMS_TABLE_BODY = document.querySelector('#mgr-items-table tbody');
const SAMPLES_TABLE_BODY = document.querySelector('#mgr-samples-table tbody');
const HISTORY_TABLE_BODY = document.querySelector('#mgr-history-table tbody');
const WALLET_TABLE_BODY = document.querySelector('#mgr-wallet-table tbody');
const WALLET_CHART_CANVAS = document.getElementById('mgr-wallet-chart');
const ITEMS_COUNT = document.getElementById('mgr-items-count');
const SAMPLES_COUNT = document.getElementById('mgr-samples-count');
const WALLET_BALANCE = document.getElementById('mgr-wallet-balance');
const HISTORY_COUNT = document.getElementById('mgr-history-count');
const INSTALL_BUTTON = document.getElementById('install-button');
let mgrWalletChart;

function formatCurrencyPKR(value) {
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(Number(value));
  } catch (e) {
    return `Rs ${Number(value).toFixed(2)}`;
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function renderWalletChart(totalIn, totalOut) {
  try {
    const data = {
      labels: ['Deposits', 'Withdrawals'],
      datasets: [{ data: [totalIn, totalOut], backgroundColor: ['#3dd598', '#e35d6a'] }],
    };
    const config = { type: 'pie', data, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } };
    if (mgrWalletChart) { mgrWalletChart.data = data; mgrWalletChart.update(); return; }
    if (WALLET_CHART_CANVAS) mgrWalletChart = new Chart(WALLET_CHART_CANVAS, config);
  } catch (e) { }
}

async function loadOverview() {
  try {
    const [itemsResp, samplesResp, historyResp, walletResp] = await Promise.all([
      fetchJson('/api/items'),
      fetchJson('/api/samples'),
      fetchJson('/api/history'),
      fetchJson('/api/wallet'),
    ]);

    const items = Array.isArray(itemsResp.items) ? itemsResp.items : [];
    const samples = Array.isArray(samplesResp.samples) ? samplesResp.samples : [];
    const history = Array.isArray(historyResp.history) ? historyResp.history : [];
    const transactions = Array.isArray(walletResp.transactions) ? walletResp.transactions : [];

    ITEMS_COUNT.innerHTML = `<div class="stat-value">${items.length}</div><div class="stat-label">Total items</div>`;
    SAMPLES_COUNT.innerHTML = `<div class="stat-value">${samples.length}</div><div class="stat-label">Samples</div>`;
    HISTORY_COUNT.innerHTML = `<div class="stat-value">${history.length}</div><div class="stat-label">History records</div>`;

    const totalIn = transactions.filter(t=>t.type==='deposit').reduce((s,i)=>s+Number(i.amount),0);
    const totalOut = transactions.filter(t=>t.type==='withdrawal').reduce((s,i)=>s+Number(i.amount),0);
    const balance = totalIn - totalOut;
    WALLET_BALANCE.innerHTML = `<div class="stat-value">${formatCurrencyPKR(balance)}</div><div class="stat-label">Wallet Balance</div>`;

    // latest items
    const latestItems = items.slice(0,10);
    if (!latestItems.length) ITEMS_TABLE_BODY.innerHTML = '<tr><td colspan="4" class="empty-state">No items</td></tr>';
    else ITEMS_TABLE_BODY.innerHTML = latestItems.map(i=>`<tr><td>${i.name}</td><td>${i.serial}</td><td>${i.quantity}</td><td>${i.status}</td></tr>`).join('');

    // latest samples
    const latestSamples = samples.slice(0,10);
    if (!latestSamples.length) SAMPLES_TABLE_BODY.innerHTML = '<tr><td colspan="4" class="empty-state">No samples</td></tr>';
    else SAMPLES_TABLE_BODY.innerHTML = latestSamples.map(s=>`<tr><td>${s.direction}</td><td>${s.name}</td><td>${s.width}</td><td>${new Date(s.timestamp).toLocaleString()}</td></tr>`).join('');

    // recent history
    const latestHistory = history.slice(0,12);
    if (!latestHistory.length) HISTORY_TABLE_BODY.innerHTML = '<tr><td colspan="3" class="empty-state">No history</td></tr>';
    else HISTORY_TABLE_BODY.innerHTML = latestHistory.map(h=>`<tr><td>${new Date(h.date).toLocaleString()}</td><td>${h.action}</td><td>${h.details}</td></tr>`).join('');

    // wallet transactions (latest)
    const latestTx = transactions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
    if (!latestTx.length) WALLET_TABLE_BODY.innerHTML = '<tr><td colspan="4" class="empty-state">No transactions</td></tr>';
    else WALLET_TABLE_BODY.innerHTML = latestTx.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.description}</td><td>${t.type}</td><td>${formatCurrencyPKR(t.amount)}</td></tr>`).join('');

    renderWalletChart(totalIn, totalOut);

  } catch (err) {
    ITEMS_TABLE_BODY.innerHTML = `<tr><td colspan="4" class="empty-state">${err.message}</td></tr>`;
  }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  INSTALL_BUTTON.classList.remove('hidden');
});

INSTALL_BUTTON.addEventListener('click', async ()=>{
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
  deferredPrompt = null;
  INSTALL_BUTTON.classList.add('hidden');
});

window.addEventListener('load', ()=>{
  loadOverview();
  setInterval(loadOverview, 60_000);
});
