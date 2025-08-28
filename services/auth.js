const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Ensure .env is loaded if not already
try { require('dotenv').config(); } catch (_) {}

// In-memory session store
const activeSessions = new Set();

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      acc[k] = decodeURIComponent(v);
    }
    return acc;
  }, {});
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies['auth'];
  return token && activeSessions.has(token);
}

function getEnvCredentials() {
  // Prefer encrypted values if present
  const encEmail = process.env.LOGIN_EMAIL_ENC;
  const encPassword = process.env.LOGIN_PASSWORD_ENC;
  const key = getEncryptionKey();
  let email = process.env.LOGIN_EMAIL || process.env.EMAIL || '';
  let password = process.env.LOGIN_PASSWORD || process.env.PASSWORD || '';
  if (encEmail && key) {
    try { email = decryptWithKey(encEmail, key); } catch (_) {}
  }
  if (encPassword && key) {
    try { password = decryptWithKey(encPassword, key); } catch (_) {}
  }
  return { email, password };
}

// Encryption helpers (AES-256-GCM)
function getEncryptionKey() {
  const keyB64 = process.env.ENCRYPTION_KEY || process.env.SECRET_KEY || '';
  if (!keyB64) return null;
  try {
    const buf = Buffer.from(keyB64, 'base64');
    if (buf.length === 32) return buf;
  } catch (_) {}
  return null;
}

function encryptWithKey(plainText, keyBuf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptWithKey(payloadB64, keyBuf) {
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

function ensureEncryptionKeyPersisted() {
  if (getEncryptionKey()) return true;
  const newKey = crypto.randomBytes(32).toString('base64');
  // Persist to .env
  const envPath = path.join(process.cwd(), '.env');
  let lines = [];
  if (fs.existsSync(envPath)) {
    try { lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/); } catch (_) { return false; }
  }
  const setOrReplace = (arr, key, value) => {
    const idx = arr.findIndex(l => l.trim().startsWith(key + '='));
    const line = `${key}=${value}`;
    if (idx === -1) arr.push(line); else arr[idx] = line;
  };
  setOrReplace(lines, 'ENCRYPTION_KEY', newKey);
  try { fs.writeFileSync(envPath, lines.join('\n')); } catch (_) { return false; }
  process.env.ENCRYPTION_KEY = newKey;
  return true;
}

module.exports = {
  activeSessions,
  generateToken,
  parseCookies,
  isAuthenticated,
  getEnvCredentials,
  getEncryptionKey,
  encryptWithKey,
  decryptWithKey,
  ensureEncryptionKeyPersisted
};

