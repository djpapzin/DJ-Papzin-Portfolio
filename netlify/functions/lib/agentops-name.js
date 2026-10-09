const catalog = require('./project-catalog.json');
function namesAgentOps(message) {
  if (/\bagent[ -]?ops[ -]mobile[ -]command[ -]center\b/i.test(message)) return true;
  if (!/\bagent[ -]?ops\b/i.test(message)) return false;
  const text = message.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const otherProject = catalog.some(project => project.repo !== 'agentops-mobile-command-center' && project.names.some(name => {
    const letters = name.toLowerCase().replace(/[^a-z0-9]/g, '').split('').join('\\s*');
    return new RegExp(`\\b${letters}\\b`).test(text);
  }));
  return !otherProject || /\b(compare|versus|vs|integrate|connect|interact|and|with)\b/i.test(message);
}
module.exports = { namesAgentOps };
