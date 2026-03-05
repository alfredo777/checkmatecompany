/**
 * GKrakenCMS - Servidor Node.js
 * Proyecto: checkmatecompany
 */

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'cc921afb25a9ebad4aa4310f63b0790e87d7107496c9625072821971639711f2',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProduction, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Handlebars
const hbs = require('express-handlebars').create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    formatDate: d => d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
    timeAgo: d => {
      if (!d) return '';
      const s = Math.floor((new Date() - new Date(d)) / 1000);
      if (s < 60) return 'hace un momento';
      if (s < 3600) return `hace ${Math.floor(s/60)} min`;
      if (s < 86400) return `hace ${Math.floor(s/3600)} horas`;
      if (s < 604800) return `hace ${Math.floor(s/86400)} días`;
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
});

// Estáticos
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rutas
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');

app.use('/admin', adminRoutes);
app.use('/blog', blogRoutes);

// API
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
    .map(f => ({ name: f.replace('.json', ''), url: '/contents/' + f.replace('.json', '') }));
  res.json({ contents: files });
});

app.get('/api/info', (req, res) => {
  res.json({ nodeVersion: process.version, project: 'checkmatecompany' });
});

// Páginas legales
app.get('/terms', (req, res) => res.render('legal/terms', { layout: 'legal', title: 'Términos' }));
app.get('/privacy', (req, res) => res.render('legal/privacy', { layout: 'legal', title: 'Privacidad' }));

// Cargar datos para vistas
function loadViewData() {
  const data = { title: 'checkmatecompany', year: new Date().getFullYear() };
  const dir = path.join(__dirname, 'contents');
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.startsWith('blog'))
      .forEach(f => {
        try {
          data[f.replace('.json', '').replace(/-/g, '_')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        } catch (e) {}
      });
  }
  return data;
}

// Página principal
app.get('/', (req, res) => res.render('index', loadViewData()));

// Otras páginas
app.get('/:page', (req, res) => {
  const viewPath = path.join(__dirname, 'views', req.params.page + '.hbs');
  if (fs.existsSync(viewPath)) {
    res.render(req.params.page, loadViewData());
  } else {
    res.status(404).render('index', { ...loadViewData(), error: 'Página no encontrada' });
  }
});

// Errores
app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

// Iniciar
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  GKRAKEN CMS - SERVIDOR INICIADO');
  console.log('='.repeat(60));
  console.log('  🌐 URL:   http://localhost:' + PORT);
  console.log('  🔐 Admin: http://localhost:' + PORT + '/admin');
  console.log('  📝 Blog:  http://localhost:' + PORT + '/blog');
  console.log('='.repeat(60));
});
