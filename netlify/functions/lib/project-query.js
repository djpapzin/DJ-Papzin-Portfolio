const { matchingProjects, normalizedName } = require('./project-matching');
function identifiesProject(message) {
  return matchingProjects(message).length > 0;
}
function shouldSearchCode(message) {
  const employer = /\b(translated|outlier|kwantu|afrisam|next\s*sapien)\b/i.test(message);
  const employmentDates = /\b(when|how long|dates?|duration|years?|months?|join(?:ed)?|employment|career|work history|experience)\b/i.test(message);
  const explicitProject = matchingProjects(message).some(project => project.repo !== 'NextSapien-Facial-Analysis') || /next\s*sapien[\s-]+facial[\s-]+analysis/i.test(message);
  const employerContext = /\b(?:at|for|with|join(?:ed)?)\s+(?:translated|outlier(?:\.ai)?|kwantu|afrisam|next\s*sapien)\b|\b(?:translated|outlier|kwantu|afrisam|next\s*sapien)(?:\.ai)?(?:'s)?\s+(?:role|employment|job|work|experience|career)\b/i.test(message);
  if (employer && employerContext && employmentDates && !explicitProject) return false;
  if (identifiesProject(message)) return true;
  // Search other technical questions by default; clear biography questions skip retrieval.
  if (/\b(code|repository|repositories|repo|implementation|source|api|function|files?|projects?|database|authentication|backend|frontend)\b|how.*\b(work|built)\b/i.test(message)) return true;
  return !/\b(experience|background|identity|biography|location|skills?|contact|email|phone|reach|hire|education|diploma|certificate|djing|music)\b|(?:start|learn|since|years).*python|python.*(?:start|learn|since|years)|\bdj\b.*(?:since|when)|when.*\bdj\b|\bwho is\b|\bwhere.*(?:based|live|located)\b/i.test(message);
}

function isNewTopic(message) {
  if (identifiesProject(message) || !shouldSearchCode(message) || /\b(projects|repositories|portfolio|letlhogonolo|papzin)\b/i.test(message)) return true;
  if (/\b(it|its|that|this|they|their|those|them|these)\b|^(tell me more|more|what else|can you explain|and that)[?.! ]*$/i.test(message)) return false;
  // Named technologies establish a new subject unless the question explicitly
  // refers back to the preceding subject with a pronoun (handled above).
  if (/\b(docker|rag|python|fastapi|django|react|langchain|tensorflow|keras|nlp|opencv)\b/i.test(message)) return true;
  const technicalFollowUp = /^(what|which|how|does|is|are|can|why|where)\b/i.test(message) && /\b(authentication|database|backend|frontend|framework|requests?|deployment|storage|language|security|testing)\b/i.test(message);
  return !technicalFollowUp;
}

function codeQuery(message, history = []) {
  const named = matchingProjects(message);
  const namedPatterns = named.flatMap(project => project.names).map(name => normalizedName(name).replace(/ /g, '').split('').join('\\s*')).join('|');
  const referenceText = namedPatterns ? normalizedName(message).replace(new RegExp(`\\b(?:this|that|these|those)\\s+(?:the\\s+)?(?:${namedPatterns})\\b`, 'g'), '') : message;
  const referentialComparison = /\b(it|its|that|this|they|their|those|them|these)\b/i.test(referenceText) && named.length > 0;
  if (isNewTopic(message) && !referentialComparison) return message;
  // Subject-less technical questions retain the latest named project. A new
  // biography topic also forms a boundary, so an older project is not revived.
  const previous = [...history].reverse().find(turn => turn.role === 'user' && isNewTopic(turn.content));
  return previous ? `${previous.content}\n${message}` : message;
}

module.exports = { codeQuery, shouldSearchCode };
