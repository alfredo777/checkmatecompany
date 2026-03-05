/**
 * Rutas del Blog - GKrakenCMS
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const POSTS_PER_PAGE = 10;
const BLOG_DIR = path.join(__dirname, '..', 'contents', 'blog');

// Helpers
function getAllPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      try {
        const content = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
        return JSON.parse(content);
      } catch (e) {
        return null;
      }
    })
    .filter(p => p && p.published !== false)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getPostBySlug(slug) {
  const filePath = path.join(BLOG_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// Lista de posts (con paginación)
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const category = req.query.category || null;
  
  let posts = getAllPosts();
  
  // Filtrar por categoría si se especifica
  if (category) {
    posts = posts.filter(p => p.category === category);
  }
  
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const startIndex = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  
  res.render('blog/index', {
    layout: 'blog',
    pageTitle: 'Blog',
    posts: paginatedPosts,
    currentPage: page,
    totalPages,
    hasMore: page < totalPages,
    nextPage: page + 1,
    category,
    year: new Date().getFullYear()
  });
});

// API: Cargar más posts (AJAX)
router.get('/api/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const category = req.query.category || null;
  
  let posts = getAllPosts();
  
  if (category) {
    posts = posts.filter(p => p.category === category);
  }
  
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const startIndex = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  
  res.json({
    posts: paginatedPosts,
    currentPage: page,
    totalPages,
    hasMore: page < totalPages
  });
});

// Post individual
router.get('/:slug', (req, res) => {
  const post = getPostBySlug(req.params.slug);
  
  if (!post) {
    return res.status(404).render('blog/index', {
      layout: 'blog',
      pageTitle: 'Post no encontrado',
      posts: [],
      error: 'El post que buscas no existe.',
      year: new Date().getFullYear()
    });
  }
  
  // Obtener posts anterior y siguiente
  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex(p => p.slug === post.slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  
  res.render('blog/post', {
    layout: 'blog',
    pageTitle: post.title,
    post,
    prevPost,
    nextPost,
    year: new Date().getFullYear()
  });
});

module.exports = router;
