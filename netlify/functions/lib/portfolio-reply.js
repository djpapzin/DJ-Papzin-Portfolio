const { profile, period, roleById, identityAnswer, contactAnswer, experienceAnswer, skillsAnswer, educationAnswer, projectAnswer, musicAnswer } = require('../../../content/profile');
const { codeQuery } = require('./project-query');
const { matchingProjects, normalizedName } = require('./project-matching');
const { namesAgentOps, namesAgentHandoff } = require('./agentops-name');
// Grounded portfolio answers; no AI provider or API key is required.
function portfolioReply(message, history = []) {
  const text = message.toLowerCase();
  const expanded = codeQuery(message, history);
  const genericFollowUp = /^(tell me more|more|what else|and that|can you explain)[?.! ]*$/i.test(message.trim());
  const topic = (matchingProjects(expanded).length || genericFollowUp ? expanded : message).toLowerCase();
  const dateIntent = /\b(when|since|dates?|duration|how long|how many years|started|began)\b/.test(text);
  const employerContext = /\b(?:at|for|with|join(?:ed)?)\s+(?:translated|outlier(?:\.ai)?|kwantu|afrisam|next\s*sapien)\b|\b(?:translated|outlier|kwantu|afrisam|next\s*sapien)(?:\.ai)?(?:'s)?\s+(?:role|employment|job|work|experience|career)\b/.test(topic);
  const employmentRole = employerContext && profile.experience.find(role => ` ${normalizedName(topic)} `.includes(` ${normalizedName(role.referenceName)} `));
  const computerVisionIntent = /\bcomputer vision\b|\bcv[\s-]+(?:projects?|models?|pipelines?|applications?|systems?|experience)\b/.test(topic);
  const contactIntent = !dateIntent && /\b(contact|email|hire|freelance|reach|phone)\b/.test(text) && (!/\b(notification|feature|store|stores|storage|database|fields?|implementation|schema|api|validation|validate|extract|parse)\b/.test(text) || /\b(?:contact|reach|hire|email|phone|call)\s+(?:him|her|you|letlhogonolo|dj papzin)\b|\bwhat\s+(?:email|phone)(?:\s+address|\s+number)?\s+(?:should|can|do)\s+i\s+use\b/.test(text));
  if (contactIntent || /\b(?:he|you|letlhogonolo|dj papzin)\s+(?:is\s+|are\s+)?available\b|\bavailability\s+(?:of|for)\s+(?:him|you|letlhogonolo|dj papzin)\b/.test(text)) return {reply:contactAnswer(), mode:'portfolio', model:'portfolio-guide'};
  if (!employerContext && !matchingProjects(text).length && /\b(remote|hybrid|start immediately|start date)\b/.test(text) && /\b(he|you|his|your|letlhogonolo|work|roles?)\b/.test(text) && !/\b(server|api|code|database|deployment)\b/.test(text)) return {reply:contactAnswer(), mode:'portfolio', model:'portfolio-guide'};
  const pythonMilestone = /\b(learn(?:ing|ed)?|build(?:ing)?|built|projects?|profession\w*|since|how long|how many years|start(?:ed)?|began|begin)\b/.test(topic) && !/\b(backend|server|api|cache|runtime|restart)\b/.test(topic);
  let namedNewProjects = matchingProjects(topic).filter(project => ['agent-handoff-kit','agentops-mobile-command-center','ChatSnap-Extractor'].includes(project.repo)).map(project => project.repo);
  if (namedNewProjects.length) namedNewProjects = matchingProjects(topic).map(project => project.repo === 'ChatSnap-Extractor' ? project.repo : project.names.find(name => name.includes(' ')) || [...project.names].sort((a,b) => a.length-b.length)[0]);
  const applicationCollection = /\b(?:all|other)\s+(?:user|users|customer|customers|account|stored|saved)\s+(?:projects|repositories|repos)\b/i.test(topic);
  if (namedNewProjects.length && !applicationCollection && /\b(projects|repositories|repos)\b/.test(topic) && /\b(?:other|all|across)\s+(?:\w+\s+){0,2}(?:projects|repositories|repos)\b|\b(?:besides|apart from|in addition to)\b/.test(topic)) {
    const peers = ['Agent Handoff Kit','AgentOps Mobile Command Center','ChatSnap-Extractor','PapzinAI','Task Tracker','TruthGuard','Vocal Thread','VisualPro','Papzin & Crew'].filter(name => !namedNewProjects.includes(name));
    return { reply: `${portfolioReply(namedNewProjects.length > 1 ? `Compare ${namedNewProjects.join(' and ')}` : namedNewProjects[0]).reply}\n\nOther portfolio projects include ${peers.join(', ')}. The prepared guide cannot perform a detailed comparison across unnamed projects. Name the projects you want to compare, or inspect their repository links in Projects.`, mode:'portfolio', model:'portfolio-guide' };
  }
  if (namedNewProjects.length > 1) {
    const facts = namedNewProjects.map(name => {
      const known = {
        'Papzin & Crew': 'Papzin & Crew is a music platform featuring mega-mixes, Cruize Friday mixes, online radio and custom mix requests. DJ Papzin co-founded it in 2016 and has been DJing since 2012.',
        'PapzinAI': 'PapzinAI coordinates coding agents and automated development workflows using Hermes, OpenClaw and custom workflows.',
        'TruthGuard': projectAnswer('truthguard'),
        'Vocal Thread': projectAnswer('vocal-thread'),
        'TalentFlow Bot': 'TalentFlow Bot supports candidate screening, interview scheduling and feedback collection.'
      };
      const supported = /^(Agent Handoff Kit|AgentOps Mobile Command Center|ChatSnap(?:-Extractor)?|Task Tracker|ID Recognition|SA ID Recognition|VisualPro|NextSapien Facial Analysis)$/i.test(name);
      const answer = known[name] || (supported ? portfolioReply(name).reply : 'The prepared guide does not have a detailed overview of this project. Inspect its repository for implementation details.');
      return `${name}: ${/His projects include|I can help you explore/.test(answer) ? 'The prepared guide does not have a detailed overview of this project. Inspect its repository for implementation details.' : answer}`;
    }).join('\n\n');
    const boundary = '\n\nThe prepared portfolio information does not establish an integration between these projects. Inspect their repositories or ask Letlhogonolo before assuming they work together.';
    return { reply: facts + boundary, mode: 'portfolio', model: 'portfolio-guide' };
  }
  let reply;
  const nextSapien = roleById('next-sapien');
  const nextSapienWork = `${profile.name} worked at ${nextSapien.organization} from ${period(nextSapien)} as ${nextSapien.title} (${nextSapien.location}). ${nextSapien.bullets.join(' ')}`;
  if (namedNewProjects.includes('ChatSnap-Extractor')) {
    reply = `${nextSapienWork} Its repository includes sample inputs and structured outputs. Open its Projects card for examples and source code.`;

  } else if (!namedNewProjects.length && /\b(at|for|with)\s+next\s*sapien/.test(topic) && !/facial|deepface/.test(topic)) {
    reply = nextSapienWork;
  } else if (!namedNewProjects.length && /next\s*sapien/.test(topic) && /facial|deepface|project|technolog|stack|code|system/.test(topic)) {
    reply = 'NextSapien Facial Analysis is a facial analysis project built with Python and DeepFace for facial attribute recognition. Its repository is github.com/djpapzin/NextSapien-Facial-Analysis.';
  } else if (!namedNewProjects.length && /next\s*sapien/.test(topic)) {
    reply = nextSapienWork;
  } else if (pythonMilestone && !namedNewProjects.length && /python/.test(topic) && /profession|on the job|for work|at work/.test(topic) && /\b(when|since|how long|how many years|what year|which year|date)\b/.test(topic) && !/kwantu|outlier|translated|afrisam/.test(topic)) {
    reply = `He began learning Python in ${profile.milestones.pythonSince}. His recorded professional Python work includes building ChatSnap-Extractor at ${nextSapien.organization} from ${period(nextSapien)}.`;
  } else if (/python/.test(topic) && /certif/.test(topic) && /when|date|year/.test(topic)) {
    reply = 'His portfolio lists a Python certificate, but does not provide its date.';
  } else if (pythonMilestone && !namedNewProjects.length && /python/.test(topic) && /\b(when|since|how long|how many years|what year|which year|date)\b/.test(topic) && !/certif|kwantu|outlier|translated/.test(topic)) {
    reply = `${profile.name} started learning Python in ${profile.milestones.pythonSince}.`;
  } else if (namedNewProjects.includes('Agent Handoff Kit')) {
    reply = projectAnswer('agent-handoff');
  } else if (namedNewProjects.includes('AgentOps Mobile Command Center')) {
    reply = projectAnswer('agentops');
  } else if (!dateIntent && /contact|email|hire|freelance|available|reach|phone/.test(topic)) {
    reply = contactAnswer();
  } else if (/music|\bdj\b|djing|mix|crew|radio/.test(topic.replace(/\bdj papzin\b/g, '')) && !/project|experience|who/.test(topic)) {
    reply = musicAnswer();
  } else if (/task tracker/.test(topic)) {
    reply = 'Task Tracker is a task management project built with FastAPI and PostgreSQL. Open Projects for its workflow overview, or contact him to discuss the implementation.';
  } else if (/id recognition/.test(topic)) {
    reply = 'The ID recognition project uses computer vision and OCR to extract information from identity documents. Open Projects for its workflow overview, or contact him to discuss the implementation.';
  } else if (employmentRole && /\b(remote|hybrid|onsite|on-site|start date|end date)\b/.test(topic)) {
    reply = `${employmentRole.referenceName} from ${period(employmentRole)} (${employmentRole.title}). Work location/arrangement: ${employmentRole.location || 'not specified in the profile'}.`;
  } else if (employerContext && /kwantu/.test(topic) && /technolog|stack|tools?|duties|responsibilit|what.*(?:do|did|work|built|use)/.test(topic) && !/when|how long|dates?|duration|years?|months?/.test(topic)) {
    reply = `At ${roleById('kwantu').referenceName}: ${roleById('kwantu').bullets.slice(0,3).join(' ')}`;
  } else if (/\bvisualpro\b/.test(topic)) {
    reply = 'VisualPro won first place at the WebGPU Hackathon. It uses WebGPU and Three.js for 3D data visualisation, with Node.js API endpoints and SQLite storage. Open its project card for the presentation and source code.';
  } else if (!namedNewProjects.length && (/\bresume\b/.test(topic) || (/\bcv\b/.test(topic) && !computerVisionIntent))) {
    reply = `Download his CV: ${profile.contact.website}${profile.cv.path}. Updated ${profile.cv.updatedOn}.`;
  } else if (!matchingProjects(topic).length && /\b(who is|who are|headline|job title|professional title|where.*(?:based|located|live)|ai solutions engineer)\b/.test(topic)) {
    reply = identityAnswer();
  } else if (/truthguard/.test(topic)) {
    reply = projectAnswer('truthguard');
  } else if (/vocal\s*thread/.test(topic)) {
    reply = projectAnswer('vocal-thread');
  } else if (computerVisionIntent) {
    reply = `Computer vision experience: ${nextSapienWork} At ${roleById('kwantu').referenceName}: ${roleById('kwantu').bullets.filter(bullet => /OCR|Detectron2/.test(bullet)).join(' ')}`;
  } else if (/project|built|build|portfolio|code|papzinai|visualpro/.test(topic)) {
    const otherProjects = [...profile.projects.filter(project => !profile.featured.includes(project.id)).map(project => project.name), 'ChatSnap-Extractor', 'PapzinAI', 'Task Tracker', 'VisualPro', 'Papzin & Crew'];
    reply = `His featured projects are ${profile.featured.map(id=>profile.projects.find(item=>item.id===id).name).join(', ')}. His other projects include ${otherProjects.join(', ')}. Open Projects for descriptions and links.`;
  } else if (/experience|years|career|background|work history|worked|work experience|freelanc/.test(topic) || employerContext) {
    reply = experienceAnswer();
  } else if (/skill|python|stack|technology|technologies|rag|langchain|nlp/.test(topic)) {
    reply = skillsAnswer();
  } else if (/education|study|diploma|qualification|certif/.test(topic)) {
    reply = educationAnswer();
  } else if (/hackathon|win|award/.test(topic)) {
    reply = 'VisualPro won the WebGPU Hackathon. His portfolio also includes participation in other AI hackathons. See Experience and Projects for the details shown on this website.';
  } else {
    reply = 'I can help you explore this portfolio. Ask about experience, skills, projects, music, education, or how to contact Letlhogonolo. I use prepared portfolio information and cannot answer general questions without an AI provider.';
  }
  return { reply, mode: 'portfolio', model: 'portfolio-guide' };
}
module.exports = { portfolioReply };
