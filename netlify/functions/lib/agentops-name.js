const catalog = require('./project-catalog.json');
function shortNameIsSubject(message, repo, pattern) {
 const text = message.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
 const subject = text.match(pattern);
 if (!subject) return false;
 if (!text.slice(0,subject.index).trim()) return true;
 if (/\b(?:and|or|with)\s+$/.test(text.slice(0,subject.index))) return true;
 if (/\b(?:connect(?:s|ed)?\s+to|integrat(?:e|es|ed)\s+with)\s+$/.test(text.slice(0,subject.index))) return true;
 if (/\b(?:how does|how do|does|can|will|is|tell me about)\s+$/.test(text.slice(0,subject.index))) return true;
 return !catalog.some(project => project.repo !== repo && project.names.some(name => {
  const letters = name.toLowerCase().replace(/[^a-z0-9]/g, '').split('').join('\\s*');
  const other = text.match(new RegExp(`\\b${letters}\\b`));
  if (!other) return false;
  if (/\b(compare|compared|comparison|differ|differences|different|similar|versus|vs)\b/i.test(text)) return false;
  return other.index < subject.index || /\b(?:in|of|for)\s+$/.test(text.slice(0,other.index));
 }));
}
function namesAgentOps(message) {
 if (/\bagentops\b|\bagent[ -]?ops[ -]mobile[ -]command[ -]center\b/i.test(message)) return true;
 return shortNameIsSubject(message,'agentops-mobile-command-center',/\bagent ops\b/);
}
function namesAgentHandoff(message) {
 if (/\bagent[ -]?handoff[ -]?kit\b/i.test(message)) return true;
 return shortNameIsSubject(message,'agent-handoff-kit',/\bagent ?handoff\b/);
}
module.exports = { namesAgentOps, namesAgentHandoff };
