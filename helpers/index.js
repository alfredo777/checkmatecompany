const fs = require('fs');
const path = require('path');

module.exports = function(hbs) {
  const helpersDir = __dirname;
  
  fs.readdirSync(helpersDir).forEach(file => {
    if (file === 'index.js' || !file.endsWith('.js')) return;
    
    try {
      const helpers = require(path.join(helpersDir, file));
      Object.keys(helpers).forEach(name => {
        hbs.registerHelper(name, helpers[name]);
      });
      console.log(`  ✓ Helpers cargados: ${file}`);
    } catch (e) {
      console.error(`  ✗ Error cargando helper ${file}:`, e.message);
    }
  });
};
