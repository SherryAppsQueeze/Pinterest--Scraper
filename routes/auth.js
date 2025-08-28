const path = require('path');
const fs = require('fs');
const express = require('express');
const { activeSessions, generateToken, parseCookies, isAuthenticated, getEnvCredentials } = require('../services/auth');
const { ensureEncryptionKeyPersisted } = require('../services/auth');
const { getEncryptionKey, encryptWithKey } = require('../services/auth');

const router = express.Router();

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.redirect('/login');
}

router.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(process.cwd(), 'auth/login.html'));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const { email: ENV_EMAIL, password: ENV_PASSWORD } = getEnvCredentials();
  if (!ENV_EMAIL || !ENV_PASSWORD) return res.status(500).json({ error: 'Server login configuration missing' });
  if (email === ENV_EMAIL && password === ENV_PASSWORD) {
    const token = generateToken();
    activeSessions.add(token);
    res.setHeader('Set-Cookie', `auth=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax`);
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies['auth'];
  if (token) activeSessions.delete(token);
  res.setHeader('Set-Cookie', 'auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

// Get current profile (email only)
router.get('/profile', requireAuth, (req, res) => {
  const { email } = getEnvCredentials();
  res.json({ email: email || '' });
});

// Update email/password in memory and persist to .env
// Verify current password before allowing updates
router.post('/profile/verify', requireAuth, (req, res) => {
  const { currentPassword } = req.body || {};
  const { password: ENV_PASSWORD } = getEnvCredentials();
  if (!ENV_PASSWORD) return res.status(500).json({ error: 'Server login configuration missing' });
  if (!currentPassword) return res.status(400).json({ error: 'Current password is required' });
  if (String(currentPassword) !== String(ENV_PASSWORD)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  return res.json({ ok: true });
});

router.post('/profile', requireAuth, (req, res) => {
  const { email, password, currentPassword } = req.body || {};
  if (!email || !password || !currentPassword) {
    return res.status(400).json({ error: 'Email, new password, and current password are required' });
  }

  // Validate current password
  const { password: ENV_PASSWORD } = getEnvCredentials();
  if (!ENV_PASSWORD) return res.status(500).json({ error: 'Server login configuration missing' });
  if (String(currentPassword) !== String(ENV_PASSWORD)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Basic email sanity check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Ensure encryption key exists
  if (!ensureEncryptionKeyPersisted()) {
    return res.status(500).json({ error: 'Unable to initialize encryption' });
  }
  const key = getEncryptionKey();
  if (!key) return res.status(500).json({ error: 'Encryption key unavailable' });

  // Encrypt values and set env overrides
  const emailEnc = encryptWithKey(String(email), key);
  const passwordEnc = encryptWithKey(String(password), key);
  process.env.LOGIN_EMAIL_ENC = emailEnc;
  process.env.LOGIN_PASSWORD_ENC = passwordEnc;

  // Persist to .env file
  const envPath = path.join(process.cwd(), '.env');
  let lines = [];
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      lines = content.split(/\r?\n/);
    } catch (e) {
      return res.status(500).json({ error: 'Failed reading .env' });
    }
  }

  const setOrReplace = (arr, key, value) => {
    const idx = arr.findIndex(l => l.trim().startsWith(key + '='));
    const line = `${key}=${value}`;
    if (idx === -1) arr.push(line); else arr[idx] = line;
  };

  // Write encrypted variants and remove plaintext
  setOrReplace(lines, 'LOGIN_EMAIL_ENC', emailEnc);
  setOrReplace(lines, 'LOGIN_PASSWORD_ENC', passwordEnc);

  // Also remove legacy EMAIL/PASSWORD to avoid confusion (optional: comment them out)
  lines = lines.filter(l => !l.trim().startsWith('LOGIN_EMAIL=') && !l.trim().startsWith('LOGIN_PASSWORD=') && !l.trim().startsWith('EMAIL=') && !l.trim().startsWith('PASSWORD='));

  try {
    fs.writeFileSync(envPath, lines.join('\n'));
  } catch (e) {
    return res.status(500).json({ error: 'Failed writing .env' });
  }

  return res.json({ ok: true });
});

module.exports = { authRouter: router, requireAuth };
