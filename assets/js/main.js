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
const EN = document.documentElement.lang === 'en';
const TXT = EN
  ? { open: 'Open menu', close: 'Close menu', nameError: 'Write your name so we know who to reply to.', hello: (n) => `Hi CheckMate, I'm ${n}.`, interest: "I'm interested in" }
  : { open: 'Abrir menú', close: 'Cerrar menú', nameError: 'Escribe tu nombre para que sepamos a quién responder.', hello: (n) => `Hola CheckMate, soy ${n}.`, interest: 'Me interesa' };
function setMenu(open) {
  hamburger.classList.toggle('active', open);
  mobileMenu.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute('aria-label', open ? TXT.close : TXT.open);
}
hamburger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) { setMenu(false); hamburger.focus(); }
});

/* ════════ SCROLL REVEAL ════════ */
document.documentElement.classList.add('js-reveal');
document.querySelectorAll('.hero .reveal').forEach((el, i) => el.style.setProperty('--i', i));
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('visible');
      revealObs.unobserve(en.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ════════ ACTIVE NAV LINK ════════ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const secObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const id = en.target.getAttribute('id');
      navLinks.forEach(l => { if (l.hash) l.classList.toggle('active', l.hash === '#' + id && l.pathname === location.pathname); });
    }
  });
}, { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' });
sections.forEach(s => secObs.observe(s));

/* ════════════════════════════════════════════
   ██  FORMULARIO DE CONTACTO → WHATSAPP
   ════════════════════════════════════════════ */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('cName');
    const errorEl = document.getElementById('cNameError');
    const name = nameEl.value.trim();
    if (name.length < 2) {
      errorEl.textContent = TXT.nameError;
      nameEl.setAttribute('aria-invalid', 'true');
      shakeEl(nameEl);
      nameEl.focus();
      return;
    }
    errorEl.textContent = '';
    nameEl.removeAttribute('aria-invalid');
    const interest = document.getElementById('cInterest').value;
    const message = document.getElementById('cMessage').value.trim();
    let text = TXT.hello(name);
    if (interest) text += `\n${TXT.interest}: ${interest}`;
    if (message) text += `\n\n${message}`;
    const number = (contactForm.dataset.wa || '').replace(/\D/g, '');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url; // si el navegador bloquea la pestaña nueva
  });
  document.getElementById('cName').addEventListener('input', (e) => {
    if (e.target.value.trim().length >= 2) {
      document.getElementById('cNameError').textContent = '';
      e.target.removeAttribute('aria-invalid');
    }
  });
}

function shakeEl(el) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.style.borderColor = '#e6836e';
  el.style.animation = 'shake .4s';
  setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 500);
}

// Add shake keyframes
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`;
document.head.appendChild(style);

})();

