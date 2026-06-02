const { Buffer } = require('buffer');
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;
const API_BASE = 'https://api.github.com/repos';

if (!OWNER || !REPO || !TOKEN) {
  console.warn('GitHub persistence is disabled until GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN are configured.');
}

function buildHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} ${text}`);
  }
  return response.json();
}

async function getFile(path) {
  const encodedPath = encodeURIComponent(path);
  const url = `${API_BASE}/${OWNER}/${REPO}/contents/${encodedPath}?ref=${BRANCH}`;
  const response = await fetch(url, { headers: buildHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub getFile failed: ${response.status} ${text}`);
  }
  return response.json();
}

function decodeContent(content) {
  return Buffer.from(content, 'base64').toString('utf8');
}

async function readJSON(path) {
  const file = await getFile(path);
  if (!file) return null;
  return JSON.parse(decodeContent(file.content));
}

async function writeJSON(path, data, message) {
  if (!OWNER || !REPO || !TOKEN) {
    throw new Error('Missing GitHub configuration to write JSON.');
  }
  const body = JSON.stringify(data, null, 2);
  const content = Buffer.from(body, 'utf8').toString('base64');
  const file = await getFile(path);
  const url = `${API_BASE}/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const payload = {
    message,
    content,
    branch: BRANCH,
  };
  if (file && file.sha) payload.sha = file.sha;
  return fetchJson(url, {
    method: 'PUT',
    headers: {
      ...buildHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function appendJSON(path, record, message) {
  const existing = (await readJSON(path)) || [];
  existing.push(record);
  return writeJSON(path, existing, message);
}

module.exports = {
  getFile,
  readJSON,
  writeJSON,
  appendJSON,
};
