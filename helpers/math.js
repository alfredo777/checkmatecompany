/**
 * Helpers matemáticos
 */
module.exports = {
  add: function(a, b) {
    return Number(a) + Number(b);
  },
  subtract: function(a, b) {
    return Number(a) - Number(b);
  },
  multiply: function(a, b) {
    return Number(a) * Number(b);
  },
  divide: function(a, b) {
    return b !== 0 ? Number(a) / Number(b) : 0;
  },
  mod: function(a, b) {
    return Number(a) % Number(b);
  },
  floor: function(n) {
    return Math.floor(Number(n));
  },
  ceil: function(n) {
    return Math.ceil(Number(n));
  },
  round: function(n, decimals) {
    const factor = Math.pow(10, decimals || 0);
    return Math.round(Number(n) * factor) / factor;
  }
};
