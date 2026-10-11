const { namesAgentOps, namesAgentHandoff } = require('./agentops-name');
const projectCatalog = require('./project-catalog.json');
const normalizedName = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function matchingProjects(message) {
  const text = ` ${normalizedName(message)} `;
  const nextSapienWork = /\b(?:at|for|with)\s+next\s*sapien\b/i.test(message) && /\b(code|project|projects|build|built|implementation|system|tool)\b/i.test(message) && !/facial|deepface|when|how long|dates?|duration|years?|months?/i.test(message);
  const matches = projectCatalog.filter(project => (project.repo !== 'agentops-mobile-command-center' || namesAgentOps(message)) && (project.repo !== 'agent-handoff-kit' || namesAgentHandoff(message)) && project.names.some(name => {
    const letters = normalizedName(name).replace(/ /g, '').split('').join('\\s*');
    const match = text.match(new RegExp(`\\b${letters}\\b`));
    if (!match) return false;
    if (project.descriptive && /\b(?:a|an|any|built in)\s+$/.test(text.slice(0,match.index)) && !message.toLowerCase().includes(name.includes('-') ? name.toLowerCase() : '__no_identifier__')) return false;
    return true;
  }));
  const musicPlatform = /\bmusic\b/i.test(message) && /\b(platform|site|streaming)\b/i.test(message) && /\b(technology|technologies|stack|code|implementation|backend|frontend|database|framework)\b/i.test(message);
  if (musicPlatform) {
    const crew = projectCatalog.find(project => project.repo === 'PapzinCrew-Music-Streaming-Platform');
    if (!matches.includes(crew)) matches.push(crew);
  }
  if (nextSapienWork) {
    const chatSnap = projectCatalog.find(project => project.repo === 'ChatSnap-Extractor');
    if (!matches.includes(chatSnap)) matches.push(chatSnap);
  }
  if (matches.length < 2) return matches;
  const relational = /\b(compare|compared|comparison|differ|different|differences|similar|versus|vs|integrate|connect|interact)\b/i.test(message);
  const contextualMatches = matches.filter(project => relational || project.names.some(name => {
    const explicitName = name.replace(/[^a-zA-Z0-9]/g, '').split('').join('\\s*');
    const strongName = new RegExp(`\\b${explicitName}\\b`).test(message.replace(/[^a-zA-Z0-9]+/g,' '));
    const relatedName = new RegExp(`\\b(?:and|with|from|than|versus|vs)\\s+(?:the\\s+)?${normalizedName(name).replace(/ /g,'').split('').join('\\s*')}\\b`, 'i').test(text);
    const explicitIdentifier = name.includes('-') && message.toLowerCase().includes(name.toLowerCase());
    return !project.descriptive || explicitIdentifier || strongName || relatedName;
  }));
  return contextualMatches.filter(project => !(project.repo === 'PapzinAI-Task-Tracker' && /\b(?:a|an|any|built in)\s+task\s*tracker\b/.test(text)) && !(project.names.includes('ID recognition') && /\b(?:a|an|any|built in)\s+id\s*recognition\b/.test(text)));
}
module.exports = { matchingProjects, normalizedName };
