const { authMiddleware, parseJsonBody, sendJson } = require('./_lib/auth');
const { readJSON, writeJSON, appendJSON } = require('./_lib/github');

const DATA_PATH = 'data/items.json';
const STATUS_OPTIONS = ['Available', 'In Use', 'Installed', 'Reserved', 'Defective'];
const LOW_STOCK_THRESHOLD = 5;

function getQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

async function getItems() {
  const items = (await readJSON(DATA_PATH)) || [];
  return items;
}

function filterItems(items, query) {
  let filtered = [...items];
  if (query.search) {
    const term = query.search.toLowerCase();
    filtered = filtered.filter((item) => [item.name, item.serial].some((value) => String(value).toLowerCase().includes(term)));
  }
  if (query.category && query.category !== 'All Items') {
    if (query.category === 'Low Stock') {
      filtered = filtered.filter((item) => Number(item.quantity) <= LOW_STOCK_THRESHOLD);
    } else {
      filtered = filtered.filter((item) => item.status === query.category);
    }
  }
  return filtered;
}

module.exports = async (req, res) => {
  const method = req.method;
  if (method === 'GET') {
    try {
      const items = await getItems();
      const query = getQuery(req);
      const result = filterItems(items, query);
      return sendJson(res, { items: result });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  const user = authMiddleware(req, res);
  if (!user) return;

  if (method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const name = String(body.name || '').trim();
      const serial = String(body.serial || '').trim();
      const quantity = Number(body.quantity || 0);
      const status = STATUS_OPTIONS.includes(body.status) ? body.status : 'Available';
      if (!name || !serial || Number.isNaN(quantity)) {
        return sendJson(res, { error: 'Missing required item details' }, 400);
      }
      const items = await getItems();
      const newItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name,
        serial,
        quantity,
        status,
        createdAt: new Date().toISOString(),
      };
      items.unshift(newItem);
      await writeJSON(DATA_PATH, items, `Add inventory item ${name}`);
      await appendJSON('data/history.json', {
        id: newItem.id,
        date: new Date().toISOString(),
        action: `Created item ${name}`,
        details: `Serial ${serial}, qty ${quantity}, status ${status}`,
      }, `Log item creation for ${name}`);
      return sendJson(res, { item: newItem });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const id = String(body.id || '').trim();
      if (!id) {
        return sendJson(res, { error: 'Missing item id' }, 400);
      }
      const items = await getItems();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        return sendJson(res, { error: 'Item not found' }, 404);
      }
      const existing = items[index];
      const updates = {
        name: body.name ? String(body.name).trim() : existing.name,
        serial: body.serial ? String(body.serial).trim() : existing.serial,
        quantity: Number.isFinite(Number(body.quantity)) ? Number(body.quantity) : existing.quantity,
        status: STATUS_OPTIONS.includes(body.status) ? body.status : existing.status,
        updatedAt: new Date().toISOString(),
      };
      const updatedItem = { ...existing, ...updates };
      items[index] = updatedItem;
      await writeJSON(DATA_PATH, items, `Update inventory item ${updatedItem.name}`);
      await appendJSON('data/history.json', {
        id: updatedItem.id,
        date: new Date().toISOString(),
        action: `Updated item ${updatedItem.name}`,
        details: `Status: ${updatedItem.status}, qty: ${updatedItem.quantity}`,
      }, `Log item update for ${updatedItem.name}`);
      return sendJson(res, { item: updatedItem });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (method === 'DELETE') {
    try {
      const query = getQuery(req);
      const body = await parseJsonBody(req).catch(() => ({}));
      const id = String(query.id || body.id || '').trim();
      if (!id) {
        return sendJson(res, { error: 'Missing item id' }, 400);
      }
      const items = await getItems();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        return sendJson(res, { error: 'Item not found' }, 404);
      }
      const removed = items.splice(index, 1)[0];
      await writeJSON(DATA_PATH, items, `Delete inventory item ${removed.name}`);
      await appendJSON('data/history.json', {
        id: removed.id,
        date: new Date().toISOString(),
        action: `Deleted item ${removed.name}`,
        details: `Serial ${removed.serial}`,
      }, `Log item deletion for ${removed.name}`);
      return sendJson(res, { success: true });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  return sendJson(res, { error: 'Method not allowed' }, 405);
};
