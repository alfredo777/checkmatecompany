/**
 * Helpers misceláneos
 */
module.exports = {
  json: function(obj) {
    return JSON.stringify(obj, null, 2);
  },
  debug: function(obj) {
    console.log('DEBUG:', obj);
    return JSON.stringify(obj, null, 2);
  },
  default: function(value, defaultValue) {
    return value || defaultValue;
  },
  times: function(n, options) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn({ index: i, num: i + 1 });
    }
    return result;
  },
  range: function(from, to, options) {
    let result = '';
    for (let i = from; i <= to; i++) {
      result += options.fn({ value: i });
    }
    return result;
  },
  ifCond: function(v1, operator, v2, options) {
    switch (operator) {
      case '==': return v1 == v2 ? options.fn(this) : options.inverse(this);
      case '===': return v1 === v2 ? options.fn(this) : options.inverse(this);
      case '!=': return v1 != v2 ? options.fn(this) : options.inverse(this);
      case '!==': return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case '<': return v1 < v2 ? options.fn(this) : options.inverse(this);
      case '<=': return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case '>': return v1 > v2 ? options.fn(this) : options.inverse(this);
      case '>=': return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case '&&': return v1 && v2 ? options.fn(this) : options.inverse(this);
      case '||': return v1 || v2 ? options.fn(this) : options.inverse(this);
      default: return options.inverse(this);
    }
  }
};
