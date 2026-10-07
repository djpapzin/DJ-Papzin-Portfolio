(function (root) {
  'use strict';
  function sourceUrl(source) {
    if (!source || typeof source.repo !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(source.repo) || /^\.+$/.test(source.repo)) return null;
    const base = 'https://github.com/djpapzin/' + encodeURIComponent(source.repo);
    if (!/^[a-f0-9]{40}$/i.test(source.revision || '')) return base;
    if (typeof source.path !== 'string' || /[\\\x00-\x1f\x7f]/.test(source.path)) return null;
    const parts = source.path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) return null;
    return base + '/blob/' + source.revision + '/' + parts.map(encodeURIComponent).join('/');
  }
  function renderReply(element, text, options = {}) {
    const doc = element.ownerDocument;
    element.replaceChildren();
    String(text).split(/\n+/).forEach(line => {
      const p = doc.createElement('p');
      line.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          const strong = doc.createElement('strong'); strong.textContent = part.slice(2, -2); p.append(strong);
        } else p.append(doc.createTextNode(part));
      });
      element.append(p);
    });
    if (options.contact) {
      const link = doc.createElement('a'); link.href = 'mailto:l.fanampe@gmail.com'; link.textContent = 'l.fanampe@gmail.com'; element.append(link);
    }
    if (options.mode === 'portfolio') {
      const label = doc.createElement('p'); label.className = 'chat-mode'; label.textContent = 'Portfolio guide · prepared answers, not AI-generated'; element.append(label);
    }
    const sources = Array.isArray(options.sources) ? options.sources.filter(source => source && source.score > 5 && sourceUrl(source)).slice(0, 3) : [];
    if (sources.length) {
      const group = doc.createElement('div'); group.className = 'chat-sources'; group.textContent = 'Source files:';
      sources.forEach(source => {
        const link = doc.createElement('a'); link.href = sourceUrl(source); link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = source.repo + (typeof source.path === 'string' ? '/' + source.path.split('/').pop() : ''); group.append(link);
      }); element.append(group);
    }
  }
  const api = { sourceUrl, renderReply };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
