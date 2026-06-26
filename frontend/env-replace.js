const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'public', 'env-config.template.js');
const outputPath = path.join(__dirname, 'public', 'env-config.js');

let content = fs.readFileSync(templatePath, 'utf8');
content = content.replace(/{{(\w+)}}/g, (match, name) => {
  const value = process.env[name];
  return value !== undefined ? value : '';
});
fs.writeFileSync(outputPath, content);
console.log('Runtime env config generated at public/env-config.js');
