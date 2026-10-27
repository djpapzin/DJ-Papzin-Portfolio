const profile = require('./profile.json');
function month(value, style = 'long') {
  if (value === null) return 'Present';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error(`Invalid profile month: ${value}`);
  return new Intl.DateTimeFormat('en-GB', { month: style, year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`));
}
function period(role, style = 'long') {
  return `${month(role.start, style)} ${style === 'long' ? 'to' : '—'} ${month(role.end, style)}`;
}
function roleById(id, data = profile) {
  const role = data.experience.find(item => item.id === id);
  if (!role) throw new Error(`Missing profile experience: ${id}`);
  return role;
}
function projectById(id, data = profile) {
  const project = data.projects.find(item => item.id === id);
  if (!project) throw new Error(`Missing profile project: ${id}`);
  return project;
}
function identityAnswer(data = profile) {
  return `${data.name}, known as ${data.knownAs}, is an ${data.role} based in ${data.location}. ${data.summary.replace(/^I /, 'He ').replace(/^He build /, 'He builds ').replace('and deploy ', 'and deploys ').replace('My work ', 'His work ')} ${data.availability}`;
}
function contactAnswer(data = profile) {
  return `${data.name} is based in ${data.location}. ${data.availability} Email ${data.contact.email}, connect at ${data.linkedin}, or call ${data.contact.phone}.`;
}
function experienceAnswer(data = profile) {
  const roles = data.experience.filter(role => role.id !== 'afrisam').map(role => `${role.referenceName} from ${period(role)} (${role.title})`);
  return `${data.name} started learning Python in ${data.milestones.pythonSince}. His AI experience includes ${roles.join('; ')}. Previously, he spent ${data.milestones.labYears} years in AfriSam’s laboratory.`;
}
function skillsAnswer(data = profile) {
  const skills = [data.skills[1], data.skills[0], ...data.skills.slice(2)].flatMap(group => group.items);
  return `His skills include ${skills.join(', ')}.`;
}
function educationAnswer(data = profile) {
  return `He holds a ${data.education.qualification} from ${data.education.institution}, with additional certificates in ${data.education.certificates.join(', ')}.`;
}
function projectAnswer(id, data = profile) {
  const item = projectById(id, data);
  const summary = item.summary.replace('My role:', 'His role:');
  const opening = summary.startsWith('A ') ? 'is a ' + summary.slice(2) : summary.charAt(0).toLowerCase() + summary.slice(1);
  return `${item.name} ${opening} ${item.detail} ${item.links.map(link => `${link.label}: ${link.url.startsWith('/') ? data.contact.website + link.url : link.url}`).join(' · ')}`;
}
function musicAnswer(data = profile) {
  return `${data.knownAs} has been DJing since ${data.milestones.djSince}. He ${data.music.summary.charAt(0).toLowerCase() + data.music.summary.slice(1)} Explore ${data.music.url}.`;
}
function buildSystemPrompt(data = profile) {
  return `You are ${data.knownAs}'s AI assistant on ${data.name}'s portfolio website. Answer warmly and concisely, using only the approved profile facts below. Never invent dates, qualifications, metrics, availability or project capabilities. Say when a fact is unavailable. Use third person for the portfolio owner; project summaries may quote his first-person wording. Give at most four sentences unless asked for detail.

PROFILE REVIEW: Verified against LinkedIn on ${data.reviewedOn}. LinkedIn: ${data.linkedin}. The shared profile is authoritative for biography; repository snippets may contain old biographies.
WHO: ${identityAnswer(data)}
HEADLINE: ${data.headline}
Started learning Python in ${data.milestones.pythonSince}.
AI EXPERIENCE: ${experienceAnswer(data)}
WORK DETAILS: ${data.experience.map(role => `${role.referenceName}: ${role.bullets.join(' ')}`).join('\n')}
SKILLS: ${skillsAnswer(data)}
ABOUT: ${data.about.join(' ')}
DJ & MUSIC: DJing since ${data.milestones.djSince}. ${musicAnswer(data)}
EDUCATION: ${educationAnswer(data)}
FEATURED PROJECTS: ${data.featured.map(id => projectAnswer(id, data)).join('\n')}
OTHER PROFILE PROJECT: ${projectAnswer('vocal-thread', data)}
OTHER PROJECTS: ChatSnap-Extractor (Django, YOLO and PaddleOCR; extracts messages, timestamps and emojis from screenshots), PapzinAI (multi-agent development workflows), Task Tracker (FastAPI and PostgreSQL), VisualPro (WebGPU and Three.js visualisation with Node.js and SQLite), TalentFlow Bot (recruitment workflow prototype), Arc-ZARDIAN, SA ID Recognition (computer vision and OCR), NextSapien Facial Analysis (Python and DeepFace).
HACKATHONS: VisualPro won first place at the WebGPU Hackathon. ElevenLabs AI Audio Challenge and Geekle.us FR1 are participation entries, not documented wins.
CONTACT: ${contactAnswer(data)}
CV: ${data.contact.website}${data.cv.path} (updated ${data.cv.updatedOn}).`;
}
module.exports = { profile, month, period, roleById, projectById, identityAnswer, contactAnswer, experienceAnswer, skillsAnswer, educationAnswer, projectAnswer, musicAnswer, buildSystemPrompt };
