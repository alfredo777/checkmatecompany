/**
 * Helpers de comparación
 */
module.exports = {
  eq: function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
  neq: function(a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  },
  gt: function(a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  },
  gte: function(a, b, options) {
    return a >= b ? options.fn(this) : options.inverse(this);
  },
  lt: function(a, b, options) {
    return a < b ? options.fn(this) : options.inverse(this);
  },
  lte: function(a, b, options) {
    return a <= b ? options.fn(this) : options.inverse(this);
  },
  and: function(a, b, options) {
    return a && b ? options.fn(this) : options.inverse(this);
  },
  or: function(a, b, options) {
    return a || b ? options.fn(this) : options.inverse(this);
  }
};
