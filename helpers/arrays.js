/**
 * Helpers de arrays
 */
module.exports = {
  length: function(arr) {
    return Array.isArray(arr) ? arr.length : 0;
  },
  first: function(arr, n) {
    if (!Array.isArray(arr)) return [];
    return n ? arr.slice(0, n) : arr[0];
  },
  last: function(arr, n) {
    if (!Array.isArray(arr)) return [];
    return n ? arr.slice(-n) : arr[arr.length - 1];
  },
  slice: function(arr, start, end) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(start, end);
  },
  includes: function(arr, value, options) {
    if (!Array.isArray(arr)) return options.inverse(this);
    return arr.includes(value) ? options.fn(this) : options.inverse(this);
  },
  join: function(arr, separator) {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator || ', ');
  }
};
