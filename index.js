/**
 * GKrakenCMS - Servidor Node.js
 * Proyecto: checkmatecompany
 * HTTPS + Asset Versioning
 */

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_PORT = process.env.HTTP_PORT || 80;
const isProduction = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════
//  ASSET VERSIONING SYSTEM
// ═══════════════════════════════════════════════════════════

const APP_VERSION = process.env.APP_VERSION || getAppVersion();
const assetHashCache = new Map();
let assetManifest = {};

/**
 * Obtiene la versión de package.json o genera un hash basado en timestamp
 */
function getAppVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    return pkg.version || '1.0.0';
  } catch (e) {
    return Date.now().toString(36);
  }
}

/**
 * Genera un hash corto basado en el contenido del archivo (content-hash)
 * Cachea los resultados para no recalcular en cada request
 */
function getFileHash(filePath) {
  // En desarrollo, limpiar cache para hot-reload
  if (!isProduction) {
    assetHashCache.delete(filePath);
  }

  if (assetHashCache.has(filePath)) {
    return assetHashCache.get(filePath);
  }

  try {
    const absolutePath = path.join(__dirname, filePath.replace(/^\//, ''));
    if (!fs.existsSync(absolutePath)) return APP_VERSION;
    const content = fs.readFileSync(absolutePath);
    const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 10);
    assetHashCache.set(filePath, hash);
    return hash;
  } catch (e) {
    return APP_VERSION;
  }
}

/**
 * Genera el manifest de assets al iniciar
 * Escanea /assets y /public recursivamente
 */
function buildAssetManifest() {
  const dirs = ['assets', 'public'];
  assetManifest = {};

  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) return;
    scanDirectory(dirPath, dir);
  });

  console.log(`  📦 Asset manifest: ${Object.keys(assetManifest).length} archivos indexados`);
}

function scanDirectory(dirPath, basePath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = '/' + path.join(basePath, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        scanDirectory(fullPath, path.join(basePath, entry.name));
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        const hash = getFileHash(relativePath);
        assetManifest[relativePath] = {
          hash,
          size: stat.size,
          mtime: stat.mtimeMs,
          versioned: `${relativePath}?v=${hash}`
        };
      }
    });
  } catch (e) {
    // silencioso
  }
}

/**
 * Genera URL versionada de un asset
 * Soporta: content-hash, version, timestamp
 */
function versionedAsset(assetPath, strategy) {
  const strat = strategy || (isProduction ? 'hash' : 'timestamp');

  // Asegurar que empiece con /
  if (!assetPath.startsWith('/')) assetPath = '/' + assetPath;

  switch (strat) {
    case 'hash':
      // Content-hash: cambia solo cuando el archivo cambia
      const hash = getFileHash(assetPath);
      return `${assetPath}?v=${hash}`;

    case 'version':
      // App version: cambia con cada deploy
      return `${assetPath}?v=${APP_VERSION}`;

    case 'timestamp':
      // Timestamp: siempre nuevo (ideal para desarrollo)
      return `${assetPath}?v=${Date.now()}`;

    case 'none':
      return assetPath;

    default:
      return `${assetPath}?v=${APP_VERSION}`;
  }
}

// Construir manifest al iniciar
buildAssetManifest();

// ═══════════════════════════════════════════════════════════
//  FILE WATCHER (desarrollo) — Invalida cache al cambiar archivos
// ═══════════════════════════════════════════════════════════

if (!isProduction) {
  const watchDirs = ['assets', 'public'];
  watchDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) return;
    try {
      fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          const relativePath = '/' + path.join(dir, filename).replace(/\\/g, '/');
          assetHashCache.delete(relativePath);
          // Reconstruir entrada en manifest
          const fullPath = path.join(dirPath, filename);
          if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            const hash = getFileHash(relativePath);
            assetManifest[relativePath] = {
              hash,
              size: stat.size,
              mtime: stat.mtimeMs,
              versioned: `${relativePath}?v=${hash}`
            };
          }
        }
      });
    } catch (e) {
      // fs.watch no soportado en todos los OS con recursive
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  HTTPS / SSL CONFIGURATION
// ═══════════════════════════════════════════════════════════

/**
 * Carga certificados SSL desde rutas configurables
 */
function loadSSLCertificates() {
  const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'privkey.pem');
  const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'fullchain.pem');
  const sslCaPath = process.env.SSL_CA_PATH || path.join(__dirname, 'ssl', 'chain.pem');

  const certs = {};

  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    certs.key = fs.readFileSync(sslKeyPath);
    certs.cert = fs.readFileSync(sslCertPath);
    if (fs.existsSync(sslCaPath)) {
      certs.ca = fs.readFileSync(sslCaPath);
    }
    certs.available = true;
  } else {
    certs.available = false;
  }

  return certs;
}

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE: HTTPS REDIRECT
// ═══════════════════════════════════════════════════════════

/**
 * Fuerza HTTPS en producción
 * Soporta proxies reversos (nginx, Cloudflare, Heroku, etc.)
 */
function httpsRedirect(req, res, next) {
  if (!isProduction) return next();

  // Verificar si ya viene por HTTPS
  const isSecure = req.secure
    || req.headers['x-forwarded-proto'] === 'https'
    || req.headers['x-forwarded-ssl'] === 'on'
    || req.headers['x-url-scheme'] === 'https';

  if (isSecure) return next();

  // Redirigir a HTTPS con 301 (permanente)
  const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
  console.log(`  🔒 Redirect HTTP → HTTPS: ${req.originalUrl}`);
  return res.redirect(301, httpsUrl);
}

app.use(httpsRedirect);

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE: SECURITY HEADERS
// ═══════════════════════════════════════════════════════════

app.use((req, res, next) => {
  // HSTS: fuerza HTTPS por 1 año
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction) {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:;");
  }
  next();
});

// ═══════════════════════════════════════════════════════════
//  TRUST PROXY (para detección correcta de HTTPS detrás de proxy)
// ═══════════════════════════════════════════════════════════

if (isProduction) {
  app.set('trust proxy', 1); // Confiar en primer proxy
}

// ═══════════════════════════════════════════════════════════
//  SESSION
// ═══════════════════════════════════════════════════════════

app.use(session({
  secret: process.env.SESSION_SECRET || 'cc921afb25a9ebad4aa4310f63b0790e87d7107496c9625072821971639711f2',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,      // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'cm.sid'               // Nombre personalizado de cookie
}));

// ═══════════════════════════════════════════════════════════
//  HANDLEBARS + ASSET HELPERS
// ═══════════════════════════════════════════════════════════

const hbs = require('express-handlebars').create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {

    // ── Asset versioning helpers ──────────────────────────
    /**
     * {{asset "/assets/css/style.css"}}
     * Genera: /assets/css/style.css?v=a3f8b2c1d0
     */
    asset: (assetPath, options) => {
      const strategy = (options && options.hash && options.hash.strategy) || null;
      return versionedAsset(assetPath, strategy);
    },

    /**
     * {{css "/assets/css/style.css"}}
     * Genera: <link rel="stylesheet" href="/assets/css/style.css?v=a3f8b2c1d0">
     */
    css: (assetPath, options) => {
      const strategy = (options && options.hash && options.hash.strategy) || null;
      const media = (options && options.hash && options.hash.media) || 'all';
      const url = versionedAsset(assetPath, strategy);
      return new hbs.handlebars.SafeString(
        `<link rel="stylesheet" href="${url}" media="${media}">`
      );
    },

    /**
     * {{js "/assets/js/app.js"}}
     * Genera: <script src="/assets/js/app.js?v=a3f8b2c1d0"></script>
     */
    js: (assetPath, options) => {
      const strategy = (options && options.hash && options.hash.strategy) || null;
      const defer = (options && options.hash && options.hash.defer) ? ' defer' : '';
      const async = (options && options.hash && options.hash.async) ? ' async' : '';
      const module = (options && options.hash && options.hash.module) ? ' type="module"' : '';
      const url = versionedAsset(assetPath, strategy);
      return new hbs.handlebars.SafeString(
        `<script src="${url}"${defer}${async}${module}></script>`
      );
    },

    /**
     * {{img "/assets/img/logo.png" alt="Logo" class="logo"}}
     * Genera: <img src="/assets/img/logo.png?v=a3f8b2c1d0" alt="Logo" class="logo" loading="lazy">
     */
    img: (assetPath, options) => {
      const strategy = (options && options.hash && options.hash.strategy) || null;
      const alt = (options && options.hash && options.hash.alt) || '';
      const cls = (options && options.hash && options.hash.class) || '';
      const width = (options && options.hash && options.hash.width) ? ` width="${options.hash.width}"` : '';
      const height = (options && options.hash && options.hash.height) ? ` height="${options.hash.height}"` : '';
      const lazy = (options && options.hash && options.hash.eager) ? '' : ' loading="lazy"';
      const url = versionedAsset(assetPath, strategy);
      return new hbs.handlebars.SafeString(
        `<img src="${url}" alt="${alt}"${cls ? ` class="${cls}"` : ''}${width}${height}${lazy}>`
      );
    },

    /**
     * {{preload "/assets/fonts/inter.woff2" as="font"}}
     * Genera: <link rel="preload" href="..." as="font" crossorigin>
     */
    preload: (assetPath, options) => {
      const as = (options && options.hash && options.hash.as) || 'script';
      const crossorigin = as === 'font' ? ' crossorigin' : '';
      const type = (options && options.hash && options.hash.type) ? ` type="${options.hash.type}"` : '';
      const url = versionedAsset(assetPath);
      return new hbs.handlebars.SafeString(
        `<link rel="preload" href="${url}" as="${as}"${type}${crossorigin}>`
      );
    },

    /**
     * {{appVersion}} → 1.2.3
     */
    appVersion: () => APP_VERSION,

    /**
     * {{assetManifestJSON}} — Útil para service workers
     */
    assetManifestJSON: () => {
      return new hbs.handlebars.SafeString(JSON.stringify(assetManifest));
    },

    // ── Helpers originales ────────────────────────────────
    formatDate: d => d ? new Date(d).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '',

    timeAgo: d => {
      if (!d) return '';
      const s = Math.floor((new Date() - new Date(d)) / 1000);
      if (s < 60) return 'hace un momento';
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} horas`;
      if (s < 604800) return `hace ${Math.floor(s / 86400)} días`;
      return new Date(d).toLocaleDateString('es-MX');
    },

    truncate: (s, l) => s && s.length > l ? s.substring(0, l) + '...' : s || '',
    year: () => new Date().getFullYear(),
    eq: (a, b) => a === b,
    json: o => JSON.stringify(o, null, 2),
    join: (a, s) => Array.isArray(a) ? a.join(s || ', ') : '',
    default: (v, d) => v || d
  }
});

// Helpers adicionales
const registerHelpers = require('./helpers');
registerHelpers(hbs.handlebars);

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE GENERAL
// ═══════════════════════════════════════════════════════════

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Variables globales para vistas
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  res.locals.appVersion = APP_VERSION;
  res.locals.isProduction = isProduction;
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  res.locals.currentPath = req.path;
  next();
});

// ═══════════════════════════════════════════════════════════
//  STATIC ASSETS + CACHE CONTROL
// ═══════════════════════════════════════════════════════════

const staticOptions = {
  etag: true,
  lastModified: true,
  maxAge: isProduction ? '1y' : '0',   // 1 año en prod (el ?v= invalida)
  immutable: isProduction,              // Cache immutable con versioning
  setHeaders: (res, filePath) => {
    // Tipos MIME personalizados si se necesitan
    if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    }
    // En producción, assets versionados son inmutables
    if (isProduction) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
};

app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));
app.use('/public', express.static(path.join(__dirname, 'public'), staticOptions));

// ═══════════════════════════════════════════════════════════
//  API: ASSET MANIFEST (útil para front-end / service workers)
// ═══════════════════════════════════════════════════════════

app.get('/api/assets/manifest', (req, res) => {
  res.json({
    version: APP_VERSION,
    environment: isProduction ? 'production' : 'development',
    totalAssets: Object.keys(assetManifest).length,
    assets: assetManifest
  });
});

app.get('/api/assets/version', (req, res) => {
  res.json({ version: APP_VERSION });
});

// Rebuild manifest on demand (solo desarrollo)
app.post('/api/assets/rebuild', (req, res) => {
  if (isProduction) return res.status(403).json({ error: 'No disponible en producción' });
  assetHashCache.clear();
  buildAssetManifest();
  res.json({ success: true, totalAssets: Object.keys(assetManifest).length });
});

// ═══════════════════════════════════════════════════════════
//  RUTAS
// ═══════════════════════════════════════════════════════════

const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');

app.use('/admin', adminRoutes);
app.use('/blog', blogRoutes);

// API de contenidos
app.get('/contents/:filename', (req, res) => {
  const jsonPath = path.join(__dirname, 'contents', req.params.filename + '.json');
  if (fs.existsSync(jsonPath)) {
    res.json(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
  } else {
    res.status(404).json({ error: 'No encontrado' });
  }
});

app.get('/api/contents', (req, res) => {
  const dir = path.join(__dirname, 'contents');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.includes('blog'))
    .map(f => ({
      name: f.replace('.json', ''),
      url: '/contents/' + f.replace('.json', '')
    }));
  res.json({ contents: files });
});

app.get('/api/info', (req, res) => {
  res.json({
    nodeVersion: process.version,
    project: 'checkmatecompany',
    appVersion: APP_VERSION,
    environment: isProduction ? 'production' : 'development',
    https: isProduction,
    totalAssets: Object.keys(assetManifest).length
  });
});

// Páginas legales
app.get('/terms', (req, res) => res.render('legal/terms', { layout: 'legal', title: 'Términos' }));
app.get('/privacy', (req, res) => res.render('legal/privacy', { layout: 'legal', title: 'Privacidad' }));

// Cargar datos para vistas
function loadViewData(req) {
  const data = {
    title: 'CheckMate Company | Agencia de Estrategia Digital',
    year: new Date().getFullYear(),
    appVersion: APP_VERSION,
    isProduction,
    baseUrl: req ? `${req.protocol}://${req.get('host')}` : ''
  };
  const dir = path.join(__dirname, 'contents');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.startsWith('blog'))
      .forEach(f => {
        try {
          data[f.replace('.json', '').replace(/-/g, '_')] =
            JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        } catch (e) { }
      });
  }
  return data;
}

// Página principal
app.get('/', (req, res) => res.render('index', loadViewData(req)));

// Otras páginas dinámicas
app.get('/:page', (req, res) => {
  const viewPath = path.join(__dirname, 'views', req.params.page + '.hbs');
  if (fs.existsSync(viewPath)) {
    res.render(req.params.page, loadViewData(req));
  } else {
    res.status(404).render('index', { ...loadViewData(req), error: 'Página no encontrada' });
  }
});

// ═══════════════════════════════════════════════════════════
//  ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

// ═══════════════════════════════════════════════════════════
//  INICIAR SERVIDOR(ES)
// ═══════════════════════════════════════════════════════════

const ssl = loadSSLCertificates();

if (isProduction && ssl.available) {
  // ── PRODUCCIÓN CON CERTIFICADOS SSL ──────────────────
  // Servidor HTTPS principal
  const httpsServer = https.createServer({
    key: ssl.key,
    cert: ssl.cert,
    ca: ssl.ca,
    // Opciones de seguridad TLS
    minVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384'
    ].join(':'),
    honorCipherOrder: true
  }, app);

  httpsServer.listen(HTTPS_PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('  GKRAKEN CMS - SERVIDOR HTTPS INICIADO');
    console.log('='.repeat(60));
    console.log(`  🔒 HTTPS:  https://checkmate.company`);
    console.log(`  🔒 Puerto: ${HTTPS_PORT}`);
    console.log(`  📦 Versión: ${APP_VERSION}`);
    console.log(`  📦 Assets:  ${Object.keys(assetManifest).length} archivos`);
    console.log(`  🔐 Admin:  https://checkmate.company/admin`);
    console.log(`  📝 Blog:   https://checkmate.company/blog`);
    console.log('='.repeat(60));
  });

  // Servidor HTTP que redirige a HTTPS
  const httpRedirectApp = express();
  httpRedirectApp.use((req, res) => {
    const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
    res.redirect(301, httpsUrl);
  });

  http.createServer(httpRedirectApp).listen(HTTP_PORT, () => {
    console.log(`  🔀 HTTP:${HTTP_PORT} → HTTPS:${HTTPS_PORT} (redirect activo)`);
  });

} else if (isProduction && !ssl.available) {
  // ── PRODUCCIÓN SIN CERTS (detrás de proxy reverso) ───
  // Nginx / Cloudflare / Load Balancer maneja SSL
  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('  GKRAKEN CMS - SERVIDOR INICIADO (PROXY MODE)');
    console.log('='.repeat(60));
    console.log(`  🌐 Puerto:    ${PORT} (detrás de proxy HTTPS)`);
    console.log(`  🔒 HTTPS:     Manejado por proxy reverso`);
    console.log(`  📦 Versión:   ${APP_VERSION}`);
    console.log(`  📦 Assets:    ${Object.keys(assetManifest).length} archivos`);
    console.log(`  🔐 Admin:     https://checkmate.company/admin`);
    console.log(`  📝 Blog:      https://checkmate.company/blog`);
    console.log('='.repeat(60));
    console.log('');
    console.log('  ⚠ No se encontraron certificados SSL.');
    console.log('  ⚠ Asegúrate de que un proxy reverso maneje HTTPS.');
    console.log('  ⚠ Rutas esperadas:');
    console.log('    SSL_KEY_PATH  = ./ssl/privkey.pem');
    console.log('    SSL_CERT_PATH = ./ssl/fullchain.pem');
    console.log('    SSL_CA_PATH   = ./ssl/chain.pem');
    console.log('');
  });

} else {
  // ── DESARROLLO ───────────────────────────────────────
  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('  GKRAKEN CMS - SERVIDOR DESARROLLO');
    console.log('='.repeat(60));
    console.log(`  🌐 URL:     http://localhost:${PORT}`);
    console.log(`  📦 Versión: ${APP_VERSION}`);
    console.log(`  📦 Assets:  ${Object.keys(assetManifest).length} archivos`);
    console.log(`  🔐 Admin:   http://localhost:${PORT}/admin`);
    console.log(`  📝 Blog:    http://localhost:${PORT}/blog`);
    console.log(`  📋 Manifest: http://localhost:${PORT}/api/assets/manifest`);
    console.log('='.repeat(60));
    console.log('  💡 Asset versioning: timestamp (sin cache)');
    console.log('  💡 HTTPS redirect: desactivado');
    console.log('');
  });
}