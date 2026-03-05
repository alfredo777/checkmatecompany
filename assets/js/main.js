/**
 * JavaScript Principal - GKrakenCMS
 * Proyecto: checkmatecompany
 * 
 * IMPORTANTE: Los datos se cargan dinámicamente desde /contents/
 * Las funciones que usan datos (render*, openPanel, etc.) se ejecutan
 * DESPUÉS de que los datos estén disponibles.
 */

// ==========================================================================
// CONFIGURACIÓN GLOBAL
// ==========================================================================

const GKraken = {
  config: {
    API_BASE: '',
    DEBUG: true,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutos
  },
  
  // Mapeo de variables originales a archivos JSON
  dataFiles: {
    
  },
  
  cache: new Map(),
  initialized: false,
  
  // ==========================================================================
  // SISTEMA DE CARGA DE DATOS
  // ==========================================================================
  
  async loadJSON(filename) {
    const cacheKey = `json_${filename}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.CACHE_DURATION) {
      if (this.config.DEBUG) console.log(`[GKraken] Cache hit: ${filename}`);
      return cached.data;
    }
    
    try {
      const url = `/contents/${filename}.json?t=${Date.now()}`;
      if (this.config.DEBUG) console.log(`[GKraken] Fetching: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      if (this.config.DEBUG) console.log(`[GKraken] Loaded: ${filename}`, data);
      return data;
    } catch (error) {
      console.error(`[GKraken] Error cargando ${filename}:`, error);
      return null;
    }
  },
  
  async loadData(varName) {
    const filename = this.dataFiles[varName];
    if (!filename) {
      console.warn(`[GKraken] No hay archivo mapeado para: ${varName}`);
      return null;
    }
    return this.loadJSON(filename);
  },
  
  async loadAllData() {
    const data = {};
    const entries = Object.entries(this.dataFiles);
    
    if (this.config.DEBUG) console.log(`[GKraken] Cargando ${entries.length} archivos de datos...`);
    
    const results = await Promise.allSettled(
      entries.map(async ([varName, filename]) => {
        const result = await this.loadJSON(filename);
        return { varName, result };
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.result !== null) {
        data[result.value.varName] = result.value.result;
      }
    });
    
    return data;
  },
  
  invalidateCache(filename) {
    if (filename) {
      this.cache.delete(`json_${filename}`);
    } else {
      this.cache.clear();
    }
  },
  
  // ==========================================================================
  // UTILIDADES
  // ==========================================================================
  
  getUploadedImage(filename) {
    return `/assets/images/myimages/${filename}`;
  },
  
  async reloadData() {
    this.invalidateCache();
    const data = await this.loadAllData();
    assignGlobalData(data);
    return data;
  }
};

// Hacer disponible globalmente
window.GKraken = GKraken;

// ==========================================================================
// VARIABLES GLOBALES (se llenan después de cargar datos)
// ==========================================================================



// Función para asignar datos a variables globales
function assignGlobalData(allData) {
  
  
  if (GKraken.config.DEBUG) {
    console.log('[GKraken] Variables globales asignadas:', {
      
    });
  }
}

// ==========================================================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================================================

async function initializeGKraken() {
  if (GKraken.initialized) {
    console.warn('[GKraken] Ya inicializado');
    return;
  }
  
  console.log('[GKraken] ═══════════════════════════════════════');
  console.log('[GKraken] Inicializando checkmatecompany...');
  console.log('[GKraken] ═══════════════════════════════════════');
  
  try {
    // 1. Cargar todos los datos
    const allData = await GKraken.loadAllData();
    
    // 2. Asignar a variables globales
    assignGlobalData(allData);
    
    // 3. Guardar referencia global
    window.appData = allData;
    
    console.log('[GKraken] Datos cargados:', Object.keys(allData));
    
    // 4. Ejecutar inicialización de la aplicación
    if (typeof initializeApp === 'function') {
      console.log('[GKraken] Ejecutando initializeApp()...');
      await initializeApp(allData);
    }
    
    // 5. Ejecutar renderizado inicial
    if (typeof renderInitial === 'function') {
      console.log('[GKraken] Ejecutando renderInitial()...');
      renderInitial();
    }
    
    // 6. Ejecutar código de página original
    if (typeof pageInit === 'function') {
      console.log('[GKraken] Ejecutando pageInit()...');
      pageInit();
    }
    
    GKraken.initialized = true;
    console.log('[GKraken] ✓ Inicialización completada');
    
  } catch (error) {
    console.error('[GKraken] ✗ Error en inicialización:', error);
  }
}

// ==========================================================================
// FUNCIÓN DE RENDERIZADO INICIAL
// (Se ejecuta después de cargar los datos)
// ==========================================================================

function renderInitial() {
  console.log('[GKraken] Renderizando componentes iniciales...');
  
  // Renderizar grids si existen las funciones y los contenedores
  if (typeof renderBentoGrids === 'function') {
    const gridFirst = document.getElementById('bentoGridFirst');
    const gridSecond = document.getElementById('bentoGridSecond');
    if (gridFirst || gridSecond) {
      console.log('[GKraken] → renderBentoGrids()');
      renderBentoGrids();
    }
  }
  
  if (typeof renderUpcomingEvents === 'function') {
    const eventsGrid = document.getElementById('eventsGrid');
    if (eventsGrid) {
      console.log('[GKraken] → renderUpcomingEvents()');
      renderUpcomingEvents();
    }
  }
  
  // Configurar event listeners
  setupEventListeners();
  
  console.log('[GKraken] ✓ Renderizado inicial completado');
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================

function setupEventListeners() {
  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (typeof closeLightbox === 'function') closeLightbox();
      if (typeof closePanel === 'function') closePanel();
      if (typeof closeEventsModal === 'function') closeEventsModal();
    }
    if (e.key === 'ArrowLeft' && typeof navigateLightbox === 'function') {
      navigateLightbox(-1);
    }
    if (e.key === 'ArrowRight' && typeof navigateLightbox === 'function') {
      navigateLightbox(1);
    }
  });
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
  
  // Lightbox background click
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === this && typeof closeLightbox === 'function') {
        closeLightbox();
      }
    });
  }
}

// ==========================================================================
// INICIAR CUANDO EL DOM ESTÉ LISTO
// ==========================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGKraken);
} else {
  // DOM ya está listo
  initializeGKraken();
}

// ==========================================================================
// CÓDIGO DE LA APLICACIÓN
// ==========================================================================



(function(){
'use strict';

/* ════════ CANVAS ANIMATION ════════ */
const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: -999, y: -999 };
let W, H;

function resizeCanvas() {
  W = canvas.width = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.4 + 0.1;
    this.baseAlpha = this.alpha;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -50) this.x = W + 50;
    if (this.x > W + 50) this.x = -50;
    if (this.y < -50) this.y = H + 50;
    if (this.y > H + 50) this.y = -50;

    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200) {
      this.alpha = this.baseAlpha + (1 - dist / 200) * 0.4;
    } else {
      this.alpha += (this.baseAlpha - this.alpha) * 0.05;
    }
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,168,76,${this.alpha})`;
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  const count = Math.min(Math.floor((W * H) / 8000), 150);
  for (let i = 0; i < count; i++) particles.push(new Particle());
}
initParticles();
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const alpha = (1 - dist / 120) * 0.08;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

// Chess piece symbols floating
const chessSymbols = ['♔','♕','♖','♗','♘','♙'];
let floatingPieces = [];
class FloatingPiece {
  constructor() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vy = -(Math.random() * 0.15 + 0.05);
    this.vx = (Math.random() - 0.5) * 0.1;
    this.symbol = chessSymbols[Math.floor(Math.random() * chessSymbols.length)];
    this.size = Math.random() * 14 + 10;
    this.alpha = Math.random() * 0.04 + 0.01;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.003;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    if (this.y < -30) { this.y = H + 30; this.x = Math.random() * W; }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.size}px serif`;
    ctx.fillStyle = `rgba(201,168,76,${this.alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.symbol, 0, 0);
    ctx.restore();
  }
}
for (let i = 0; i < 12; i++) floatingPieces.push(new FloatingPiece());

function animate() {
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  floatingPieces.forEach(fp => { fp.update(); fp.draw(); });
  requestAnimationFrame(animate);
}
animate();

document.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

/* ════════ CURSOR GLOW ════════ */
const glow = document.getElementById('cursorGlow');
if (window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
} else {
  glow.style.display = 'none';
}

/* ════════ NAV SCROLL ════════ */
const nav = document.getElementById('nav');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const st = window.scrollY;
  nav.classList.toggle('scrolled', st > 50);
  lastScroll = st;

  // WA fab mini
  const wf = document.getElementById('waFab');
  if (wf) wf.classList.toggle('mini', st > 400);
});

/* ════════ HAMBURGER ════════ */
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
  });
});

/* ════════ SCROLL REVEAL ════════ */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('visible');
      revealObs.unobserve(en.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ════════ COUNTER ANIMATION ════════ */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const el = en.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
      counterObs.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));

/* ════════ ACTIVE NAV LINK ════════ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const secObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const id = en.target.getAttribute('id');
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }
  });
}, { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' });
sections.forEach(s => secObs.observe(s));

/* ════════════════════════════════════════════
   ██  QUOTE FORM LOGIC
   ════════════════════════════════════════════ */
let currentStep = 0;
const totalSteps = 3;
const stepDots = document.querySelectorAll('.form-step-dot');
const panels = document.querySelectorAll('.form-panel');

function updateSteps() {
  stepDots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i === currentStep) dot.classList.add('active');
    else if (i < currentStep) dot.classList.add('done');
  });
  panels.forEach((p, i) => {
    p.classList.toggle('active', i === currentStep);
  });
}

window.nextStep = function() {
  // Validate current step
  if (currentStep === 0) {
    const name = document.getElementById('qName').value.trim();
    const email = document.getElementById('qEmail').value.trim();
    if (!name || name.length < 2) {
      shakeEl(document.getElementById('qName'));
      document.getElementById('qName').focus();
      return;
    }
    if (!email || !email.includes('@')) {
      shakeEl(document.getElementById('qEmail'));
      document.getElementById('qEmail').focus();
      return;
    }
  }
  if (currentStep < totalSteps - 1) {
    currentStep++;
    updateSteps();
  }
};
window.prevStep = function() {
  if (currentStep > 0) {
    currentStep--;
    updateSteps();
  }
};

function shakeEl(el) {
  el.style.borderColor = '#e6836e';
  el.style.animation = 'shake .4s';
  setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 500);
}

// Service chips
document.querySelectorAll('.svc-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('selected'));
});

// Budget slider
const budgetRange = document.getElementById('budgetRange');
const budgetAmount = document.getElementById('budgetAmount');
budgetRange.addEventListener('input', () => {
  const v = parseInt(budgetRange.value);
  budgetAmount.textContent = v >= 500000 ? '500,000+' : v.toLocaleString('en-US');
});

// Submit
window.submitQuote = function() {
  const name = document.getElementById('qName').value.trim();
  const email = document.getElementById('qEmail').value.trim();
  const company = document.getElementById('qCompany').value.trim();
  const phone = document.getElementById('qPhone').value.trim();
  const details = document.getElementById('qDetails').value.trim();
  const urgency = document.getElementById('qUrgency').value;
  const source = document.getElementById('qSource').value;
  const budget = budgetRange.value;

  const selectedSvcs = [];
  document.querySelectorAll('.svc-chip.selected').forEach(c => selectedSvcs.push(c.dataset.svc));

  // Gen code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CM-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

  // Build WhatsApp message
  let waMsg = `🏆 *NUEVA SOLICITUD DE COTIZACIÓN*\n\n`;
  waMsg += `♟ *Código:* ${code}\n`;
  waMsg += `👤 *Nombre:* ${name}\n`;
  if (company) waMsg += `🏢 *Empresa:* ${company}\n`;
  waMsg += `📧 *Email:* ${email}\n`;
  if (phone) waMsg += `📱 *Teléfono:* ${phone}\n`;
  if (selectedSvcs.length) waMsg += `🎯 *Servicios:* ${selectedSvcs.join(', ')}\n`;
  waMsg += `💰 *Presupuesto:* $${parseInt(budget).toLocaleString('en-US')} MXN\n`;
  if (urgency) waMsg += `⚡ *Urgencia:* ${urgency}\n`;
  if (source) waMsg += `📍 *Fuente:* ${source}\n`;
  if (details) waMsg += `\n📋 *Detalles:*\n${details}\n`;
  waMsg += `\n_Enviado desde checkmate.company_`;

  // Show success
  document.getElementById('quoteForm').style.display = 'none';
  document.querySelector('.form-steps').style.display = 'none';
  document.getElementById('successCode').textContent = code;
  const fs = document.getElementById('formSuccess');
  fs.classList.add('active');

  // Update WhatsApp link in success
  const waLink = fs.querySelector('a.btn-primary');
  waLink.href = `https://wa.me/5215537705731?text=${encodeURIComponent(waMsg)}`;

  // Also open WhatsApp
  setTimeout(() => {
    window.open(`https://wa.me/5215537705731?text=${encodeURIComponent(waMsg)}`, '_blank');
  }, 800);
};

// Add shake keyframes
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`;
document.head.appendChild(style);

/* ════════ CARD HOVER TILT ════════ */
if (window.innerWidth > 768) {
  document.querySelectorAll('.service-card, .why-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

})();

