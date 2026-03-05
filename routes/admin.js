/**
 * Rutas de Administración - GKrakenCMS
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAuth, redirectIfAuth, verifyCredentials } = require('../middleware/auth');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'assets', 'images', 'myimages');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Solo imágenes permitidas'));
    }
  }
});

// Helpers
function getContents() {
  const dir = path.join(__dirname, '..', 'contents');
  if (!fs.existsSync(dir)) return [];
  
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.startsWith('blog'))
    .map(f => {
      const stats = fs.statSync(path.join(dir, f));
      return {
        name: f.replace('.json', ''),
        size: formatBytes(stats.size),
        modified: stats.mtime.toLocaleDateString('es-MX')
      };
    });
}

function getBlogPosts() {
  const dir = path.join(__dirname, '..', 'contents', 'blog');
  if (!fs.existsSync(dir)) return [];
  
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (e) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getImages(folder = '') {
  const dir = path.join(__dirname, '..', 'assets', 'images', folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(f));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ========== AUTENTICACIÓN ==========

router.get('/login', redirectIfAuth, (req, res) => {
  res.render('admin/login', { layout: 'admin', error: req.query.error, message: req.query.message });
});

router.post('/login', (req, res) => {
  if (verifyCredentials(req.body.username, req.body.password)) {
    req.session.isAuthenticated = true;
    req.session.username = req.body.username;
    res.redirect(req.session.returnTo || '/admin');
  } else {
    res.redirect('/admin/login?error=Credenciales incorrectas');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login?message=Sesión cerrada'));
});

// ========== DASHBOARD ==========

router.get('/', requireAuth, (req, res) => {
  res.render('admin/dashboard', {
    layout: 'admin',
    pageTitle: 'Dashboard',
    isAuthenticated: true,
    username: req.session.username,
    contents: getContents(),
    stats: {
      contentsCount: getContents().length,
      postsCount: getBlogPosts().length,
      imagesCount: getImages().length,
      myImagesCount: getImages('myimages').length
    }
  });
});

// ========== CONTENIDOS ==========

router.get('/contents', requireAuth, (req, res) => {
  res.render('admin/contents', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    contents: getContents(),
    message: req.query.message,
    error: req.query.error
  });
});

router.get('/contents/new', requireAuth, (req, res) => {
  res.render('admin/editor', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    isNew: true,
    jsonContent: JSON.stringify({ title: '', data: [] }, null, 2),
    myImages: getImages('myimages'),
    siteImages: getImages()
  });
});

router.get('/contents/edit/:name', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '..', 'contents', req.params.name + '.json');
  if (!fs.existsSync(filePath)) return res.redirect('/admin/contents?error=Archivo no encontrado');
  
  let jsonContent = '';
  try {
    jsonContent = JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf8')), null, 2);
  } catch (e) {
    jsonContent = fs.readFileSync(filePath, 'utf8');
  }
  
  res.render('admin/editor', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    isNew: false,
    filename: req.params.name,
    jsonContent,
    myImages: getImages('myimages'),
    siteImages: getImages()
  });
});

router.post('/contents/save', requireAuth, (req, res) => {
  let { filename, content, isNew, newFilename } = req.body;
  if (isNew === 'true' && newFilename) filename = newFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  try {
    const parsed = JSON.parse(content);
    fs.writeFileSync(
      path.join(__dirname, '..', 'contents', filename + '.json'),
      JSON.stringify(parsed, null, 2)
    );
    res.redirect('/admin/contents?message=Guardado correctamente');
  } catch (e) {
    res.redirect('/admin/contents?error=JSON inválido');
  }
});

router.post('/contents/delete', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '..', 'contents', req.body.filename + '.json');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.redirect('/admin/contents?message=Eliminado');
});

router.get('/contents/preview/:name', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '..', 'contents', req.params.name + '.json');
  if (fs.existsSync(filePath)) {
    res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } else {
    res.status(404).json({ error: 'No encontrado' });
  }
});

// ========== BLOG ==========

router.get('/blog', requireAuth, (req, res) => {
  res.render('admin/blog-posts', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    posts: getBlogPosts(),
    message: req.query.message,
    error: req.query.error
  });
});

router.get('/blog/new', requireAuth, (req, res) => {
  const categories = [...new Set(getBlogPosts().map(p => p.category).filter(Boolean))];
  res.render('admin/blog-editor', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    isNew: true,
    post: { published: true },
    categories,
    images: getImages('myimages')
  });
});

router.get('/blog/edit/:slug', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '..', 'contents', 'blog', req.params.slug + '.json');
  if (!fs.existsSync(filePath)) return res.redirect('/admin/blog?error=Post no encontrado');
  
  const post = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const categories = [...new Set(getBlogPosts().map(p => p.category).filter(Boolean))];
  
  res.render('admin/blog-editor', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    isNew: false,
    post,
    categories,
    images: getImages('myimages')
  });
});

router.post('/blog/save', requireAuth, upload.single('image'), (req, res) => {
  const { title, slug, excerpt, content, category, tags, author, published, isNew, originalSlug, existingImage, currentImage } = req.body;
  
  // Generar slug si está vacío
  let finalSlug = slug || title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Determinar imagen
  let image = currentImage;
  if (req.file) {
    image = '/assets/images/myimages/' + req.file.filename;
  } else if (existingImage) {
    image = existingImage;
  }
  
  const post = {
    id: finalSlug,
    title,
    slug: finalSlug,
    excerpt: excerpt || title,
    content,
    author: author || 'Admin',
    category: category || '',
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    image,
    published: published === 'on',
    created_at: isNew === 'true' ? new Date().toISOString() : undefined,
    updated_at: new Date().toISOString()
  };
  
  // Si editando y cambió el slug, eliminar archivo viejo
  if (isNew !== 'true' && originalSlug && originalSlug !== finalSlug) {
    const oldPath = path.join(__dirname, '..', 'contents', 'blog', originalSlug + '.json');
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  
  // Mantener fecha de creación original si editamos
  if (isNew !== 'true') {
    const existingPath = path.join(__dirname, '..', 'contents', 'blog', finalSlug + '.json');
    if (fs.existsSync(existingPath)) {
      const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      post.created_at = existing.created_at;
    }
  }
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'contents', 'blog', finalSlug + '.json'),
    JSON.stringify(post, null, 2)
  );
  
  res.redirect('/admin/blog?message=Post guardado');
});

router.post('/blog/delete', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '..', 'contents', 'blog', req.body.slug + '.json');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.redirect('/admin/blog?message=Post eliminado');
});

// ========== IMÁGENES ==========

router.get('/images', requireAuth, (req, res) => {
  res.render('admin/images', {
    layout: 'admin',
    isAuthenticated: true,
    username: req.session.username,
    myImages: getImages('myimages'),
    siteImages: getImages(),
    message: req.query.message
  });
});

router.post('/images/upload', requireAuth, upload.array('images', 10), (req, res) => {
  res.redirect('/admin/images?message=' + (req.files?.length || 0) + ' imagen(es) subida(s)');
});

router.post('/images/delete', requireAuth, (req, res) => {
  const basePath = req.body.folder === 'myimages' 
    ? path.join(__dirname, '..', 'assets', 'images', 'myimages')
    : path.join(__dirname, '..', 'assets', 'images');
  const filePath = path.join(basePath, req.body.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.redirect('/admin/images?message=Imagen eliminada');
});

module.exports = router;
