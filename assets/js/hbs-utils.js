/**
 * Handlebars Client-Side Utilities
 */

// Registrar helpers en el cliente si Handlebars está disponible
if (typeof Handlebars !== 'undefined') {
  // Comparación
  Handlebars.registerHelper('eq', function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });
  
  Handlebars.registerHelper('neq', function(a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });
  
  // Strings
  Handlebars.registerHelper('uppercase', function(str) {
    return str ? str.toUpperCase() : '';
  });
  
  Handlebars.registerHelper('truncate', function(str, len) {
    if (!str) return '';
    return str.length <= len ? str : str.substring(0, len) + '...';
  });
  
  // Arrays
  Handlebars.registerHelper('length', function(arr) {
    return Array.isArray(arr) ? arr.length : 0;
  });
  
  // Fechas
  Handlebars.registerHelper('year', function() {
    return new Date().getFullYear();
  });
  
  // Misc
  Handlebars.registerHelper('json', function(obj) {
    return JSON.stringify(obj, null, 2);
  });
  
  console.log('[GKraken] Handlebars helpers registrados');
}
