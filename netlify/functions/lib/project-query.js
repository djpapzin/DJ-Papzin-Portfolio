const { matchingProjects, normalizedName } = require('./project-matching');
function identifiesProject(message) {
  return matchingProjects(message).length > 0;
}
function shouldSearchCode(message) {
  const namedProjects = matchingProjects(message);
  const technicalDetails = /\b(code|source|repository|repositories|repos?|implement(?:ation|ed|ing)?|api|functions?|files?|architecture|how)\b/i.test(message);
  // Hiring terms and personal contributions are profile facts. Repository
  // keyword matches cannot establish preferences or authorship of team work.
  const hiringTerms = /\b(salary|salaries|compensation|remuneration|pay|relocat(?:e|ion|ing)|notice period|work permit|work authorization|visa sponsorship)\b/i.test(message);
  const personalContribution = /\b(his|he|him|your|you|my|i|papzin|fanampe)\b/i.test(message) && /\b(contribut(?:e[ds]?|ions?|ing)|personally|responsib(?:le|ility))\b/i.test(message);
  const projectOverview = /\bprojects?\b/i.test(message) && /\b(best|strongest|showcase|demonstrate|highlight|recommend|portfolio|skills?)\b/i.test(message);
  if (personalContribution || (hiringTerms && !namedProjects.length) || (projectOverview && !namedProjects.length && !technicalDetails)) return false;
  const employer = /\b(translated|outlier|kwantu|afrisam|next\s*sapien)\b/i.test(message);
  const employmentDates = /\b(when|how long|dates?|duration|years?|months?|join(?:ed)?|employment|career|work history|experience)\b/i.test(message);
  const explicitProject = namedProjects.some(project => project.repo !== 'NextSapien-Facial-Analysis') || /next\s*sapien[\s-]+facial[\s-]+analysis/i.test(message);
  const employerContext = /\b(?:at|for|with|join(?:ed)?)\s+(?:translated|outlier(?:\.ai)?|kwantu|afrisam|next\s*sapien)\b|\b(?:translated|outlier|kwantu|afrisam|next\s*sapien)(?:\.ai)?(?:'s)?\s+(?:role|employment|job|work|experience|career)\b/i.test(message);
  if (employer && employerContext && !explicitProject) return false;
  if (identifiesProject(message)) return true;
  // Recruiter questions are grounded in the profile, not incidental code matches.
  const roleFit = /\b(?:fit|fits|suitable|qualified|candidate)\b.*\b(?:role|position|job)\b|\b(?:ai|solutions?) engineer\b.*\b(?:role|position)\b/i.test(message);
  const companyDates = /\bcompan(?:y|ies)\b/i.test(message) && employmentDates;
  if (roleFit || companyDates) return false;
  // A recruiter asking for a computer-vision overview needs the approved
  // experience, not arbitrary repository matches for the short acronym "CV".
  const visionOverview = /\b(cv|computer vision)\b/i.test(message) && /\b(projects?|experience|work)\b/i.test(message);
  if (visionOverview && !technicalDetails) return false;
  // Search other technical questions by default; clear biography questions skip retrieval.
  if (/\b(code|repository|repositories|repo|implementation|source|api|function|files?|projects?|database|authentication|backend|frontend)\b|how.*\b(work|built)\b/i.test(message)) return true;
  return !/\b(experience|background|identity|biography|headline|title|availability|remote|hybrid|resume|cv|location|skills?|contact|email|phone|reach|hire|education|diploma|certificate|djing|music)\b|(?:start|learn|since|years).*python|python.*(?:start|learn|since|years)|\bdj\b.*(?:since|when)|when.*\bdj\b|\bwho is\b|\bwhere.*(?:based|live|located)\b/i.test(message);
}

function isNewTopic(message) {
  if (identifiesProject(message) || !shouldSearchCode(message) || /\b(projects|repositories|portfolio|letlhogonolo|papzin)\b/i.test(message)) return true;
  if (/\b(it|its|that|this|they|their|those|them|these|there)\b|^(tell me more|more|what else|can you explain|and that)[?.! ]*$/i.test(message)) return false;
  // Named technologies establish a new subject unless the question explicitly
  // refers back to the preceding subject with a pronoun (handled above).
  if (/\b(docker|rag|python|fastapi|django|react|langchain|tensorflow|keras|nlp|opencv)\b/i.test(message)) return true;
  const technicalFollowUp = /^(what|which|how|does|is|are|can|why|where)\b/i.test(message) && /\b(authentication|database|backend|frontend|framework|requests?|deployment|storage|language|security|testing|telegram|commands?|approvals?|model routing|checkpoints?|receipts?|replay)\b/i.test(message);
  return !technicalFollowUp;
}

function codeQuery(message, history = []) {
  const named = matchingProjects(message);
  const namedPatterns = named.flatMap(project => project.names).map(name => normalizedName(name).replace(/ /g, '').split('').join('\\s*')).join('|');
  const referenceText = namedPatterns ? normalizedName(message).replace(new RegExp(`\\b(?:this|that|these|those)\\s+(?:the\\s+)?(?:${namedPatterns})\\b`, 'g'), '') : message;
  // Possessives inside an explicitly named subject describe that project.
  // Independent pronouns in a relationship question can refer to the prior one.
  const normalized = normalizedName(message);
  const firstNamed = namedPatterns ? normalized.search(new RegExp(`\\b(?:${namedPatterns})\\b`)) : -1;
  const leadingPossessive = firstNamed >= 0 && /\b(its|their)\b/i.test(normalized.slice(0,firstNamed));
  const independentReference = /\b(it|that|this|they|those|them|these)\b/i.test(referenceText.replace(/\b(?:is|was|would) it (?:possible|necessary|easy|hard|safe|worth)\b|\bdoes it make sense\b|\b(?:if|when|while|because|once|after|before|unless|as)\s+(?:it|they)\b/gi, ''));
  const leadingReference = firstNamed >= 0 && /\b(it|that|this|they|those|them|these)\b/i.test(normalized.slice(0, firstNamed));
  const relationship = /\b(compare\w*|comparison|differ\w*|relat\w*|integrat\w*|connect\w*|depend\w*|use[sd]?|using|versus|vs)\b|\bworks? with\b|\b(?:built|based) on\b/i.test(message);
  // In "Agent Handoff Kit ... is it production-ready?", "it" refers to the
  // named subject, not an older project or recruiter question.
  const referentialComparison = named.length > 0 && (leadingPossessive || (independentReference && (leadingReference || relationship)));
  if (isNewTopic(message) && !referentialComparison) return message;
  // Subject-less technical questions retain the latest named project. A new
  // biography topic also forms a boundary, so an older project is not revived.
  const previousIndex = history.findLastIndex(turn => turn.role === 'user' && isNewTopic(turn.content));
  return previousIndex >= 0 ? `${codeQuery(history[previousIndex].content, history.slice(0, previousIndex))}\n${message}` : message;
}

module.exports = { codeQuery, shouldSearchCode };
