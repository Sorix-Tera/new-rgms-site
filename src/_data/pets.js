const fs = require('fs');
const path = require('path');

module.exports = function () {
  const dir = path.join(__dirname, '../icons/pets');
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => f.replace(/\.[^.]+$/, ''))
    // exclude alternate-art variants (suffixed _1) and unknown fallback
    .filter(name => name !== 'unknown' && !name.endsWith('_1'))
    .sort();
};
