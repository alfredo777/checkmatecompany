/**
 * Helpers de strings
 */
module.exports = {
  uppercase: function(str) {
    return str ? str.toUpperCase() : '';
  },
  lowercase: function(str) {
    return str ? str.toLowerCase() : '';
  },
  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  truncate: function(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
  },
  replace: function(str, find, replace) {
    if (!str) return '';
    return str.replace(new RegExp(find, 'g'), replace);
  },
  slugify: function(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
};
