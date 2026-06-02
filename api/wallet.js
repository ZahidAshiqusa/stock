const { authMiddleware, parseJsonBody, sendJson } = require('./_lib/auth');
const { readJSON, writeJSON, appendJSON } = require('./_lib/github');
const DATA_PATH = 'data/wallet.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const transactions = (await readJSON(DATA_PATH)) || [];
      return sendJson(res, { transactions });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (req.method === 'POST') {
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
      const body = await parseJsonBody(req);
      const description = String(body.description || '').trim();
      const amount = Number(body.amount || 0);
      const type = body.type === 'withdrawal' ? 'withdrawal' : 'deposit';
      if (!description || amount <= 0) {
        return sendJson(res, { error: 'Invalid wallet transaction' }, 400);
      }
      const transactions = (await readJSON(DATA_PATH)) || [];
      const transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        description,
        amount,
        type,
        date: new Date().toISOString(),
      };
      transactions.unshift(transaction);
      await writeJSON(DATA_PATH, transactions, `Add wallet transaction ${description}`);
      await appendJSON('data/history.json', {
        id: transaction.id,
        date: transaction.date,
        action: `Wallet ${type}`,
        details: `${description}, amount ${amount}`,
      }, `Log wallet transaction ${description}`);
      return sendJson(res, { transaction });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  return sendJson(res, { error: 'Method not allowed' }, 405);
};
