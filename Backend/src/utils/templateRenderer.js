// src/utils/templateRenderer.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

function loadTemplate(name, lang = 'en') {
  const tplPath = path.join(__dirname, '..', 'templates', `${name}.${lang}.hbs`);
  if (!fs.existsSync(tplPath)) {
    // fallback to default template file without lang
    const fallback = path.join(__dirname, '..', 'templates', `${name}.hbs`);
    if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf8');
    throw new Error(`Template not found: ${tplPath}`);
  }
  return fs.readFileSync(tplPath, 'utf8');
}

function renderTemplateString(templateString, payload = {}) {
  const tpl = Handlebars.compile(templateString);
  return tpl(payload);
}

module.exports = { loadTemplate, renderTemplateString };
