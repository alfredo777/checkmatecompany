/**
 * Middleware de Autenticación - GKrakenCMS
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  try {
    const credsPath = path.join(__dirname, '..', 'config', 'credentials.json');
    return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  } catch (error) {
    console.error('Error cargando credenciales:', error);
    return null;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256')
    .update(password + 'gkraken_salt_2024')
    .digest('hex');
}

function verifyCredentials(username, password) {
  const creds = loadCredentials();
  if (!creds || !creds.admin) return false;
  
  return creds.admin.username === username && 
         creds.admin.password_hash === hashPassword(password);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    res.locals.isAuthenticated = true;
    res.locals.username = req.session.username;
    return next();
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = {
  loadCredentials,
  hashPassword,
  verifyCredentials,
  requireAuth,
  redirectIfAuth
};
