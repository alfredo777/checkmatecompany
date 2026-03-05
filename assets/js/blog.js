/**
 * Blog JavaScript - Carga dinámica
 */

document.addEventListener('DOMContentLoaded', function() {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const postsContainer = document.getElementById('postsContainer');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async function() {
      const page = parseInt(this.dataset.page);
      const category = this.dataset.category || '';
      
      // Mostrar spinner
      loadMoreBtn.classList.add('d-none');
      loadingSpinner.classList.remove('d-none');
      
      try {
        const url = `/blog/api/posts?page=${page}${category ? '&category=' + category : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Agregar posts al contenedor
        data.posts.forEach(post => {
          const postHtml = createPostCard(post);
          postsContainer.insertAdjacentHTML('beforeend', postHtml);
        });
        
        // Actualizar botón
        if (data.hasMore) {
          loadMoreBtn.dataset.page = page + 1;
          loadMoreBtn.classList.remove('d-none');
        } else {
          loadMoreContainer.innerHTML = '<p class="text-muted">No hay más posts</p>';
        }
      } catch (error) {
        console.error('Error cargando posts:', error);
        loadMoreBtn.classList.remove('d-none');
      } finally {
        loadingSpinner.classList.add('d-none');
      }
    });
  }
  
  function createPostCard(post) {
    const imageHtml = post.image 
      ? `<img src="${post.image}" class="card-img-top" alt="${post.title}" loading="lazy">`
      : `<div class="card-img-top blog-card-placeholder"><i class="bi bi-image"></i></div>`;
    
    const categoryHtml = post.category
      ? `<a href="/blog?category=${post.category}" class="badge bg-success">${post.category}</a>`
      : '';
    
    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <article class="card blog-card h-100">
          ${imageHtml}
          <div class="card-body d-flex flex-column">
            <div class="blog-card-meta mb-2">
              ${categoryHtml}
              <small class="text-muted">${timeAgo(post.created_at)}</small>
            </div>
            <h2 class="card-title h5">
              <a href="/blog/${post.slug}">${post.title}</a>
            </h2>
            <p class="card-text text-muted flex-grow-1">${truncate(post.excerpt, 120)}</p>
            <a href="/blog/${post.slug}" class="btn btn-outline-success mt-auto">
              Leer más <i class="bi bi-arrow-right"></i>
            </a>
          </div>
        </article>
      </div>
    `;
  }
  
  function truncate(str, len) {
    if (!str) return '';
    return str.length <= len ? str : str.substring(0, len) + '...';
  }
  
  function timeAgo(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
    
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
});
