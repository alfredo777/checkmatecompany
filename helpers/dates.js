/**
 * Helpers de fechas
 */
module.exports = {
  year: function() {
    return new Date().getFullYear();
  },
  formatDate: function(date, format) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return d.toLocaleDateString('es-MX', options);
  },
  formatDateTime: function(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  timeAgo: function(date) {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`;
    
    return d.toLocaleDateString('es-MX');
  },
  isoDate: function(date) {
    if (!date) return new Date().toISOString();
    return new Date(date).toISOString();
  }
};
