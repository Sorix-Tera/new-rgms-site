const fs = require('fs');
const path = require('path');

module.exports = function () {
  const dir = path.join(__dirname, '../icons/heroes2');
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => f.replace(/\.[^.]+$/, ''))
    .filter(name => name !== 'unknown')
    .sort();
};
