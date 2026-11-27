// data/*.json を file:// でも読めるよう data/guide-data.js にまとめる
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const payload = { categories: read('categories.json'), matchups: read('matchups.json') };
fs.writeFileSync(
  path.join(dataDir, 'guide-data.js'),
  `window.FIORA_GUIDE_DATA = ${JSON.stringify(payload, null, 2)};\n`
);
console.log('data/guide-data.js を更新しました');
