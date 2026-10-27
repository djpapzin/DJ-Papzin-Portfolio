#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { profile, period, projectById } = require('../content/profile');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function link(label, url, className = '') {
  if (!/^(https:\/\/|\/(?!\/)|mailto:|tel:)/.test(url)) throw new Error(`Unsupported profile link: ${url}`);
  return `<a href="${escape(url)}"${className ? ` class="${className}"` : ''}${url.endsWith('.pdf') ? ' download' : ''}${url.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(label)}</a>`;
}
function validateProfile(data) {
  for (const key of ['name','knownAs','role','headline','summary','location','availability','reviewedOn']) if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`Missing profile field: ${key}`);
  for (const list of [data.experience, data.projects]) if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('Duplicate profile IDs');
  for (const role of data.experience) { period(role); if (role.end && role.end < role.start) throw new Error(`Invalid experience range: ${role.id}`); }
  if (new Set(data.featured).size !== data.featured.length) throw new Error('Duplicate featured projects');
  for (const id of data.featured) projectById(id, data);
  if (!/^\/assets\/[A-Za-z0-9._-]+\.pdf$/.test(data.cv.path)) throw new Error('CV must be a PDF in /assets/');
}
function projectCard(item, featured = false) {
  return `<article class="project-card"${featured ? '' : ` id="project-${escape(item.id)}"`}>
  <img class="project-preview" src="${escape(item.image)}" alt="${escape(item.imageAlt)}" loading="lazy">
  <h3>${escape(item.name)}</h3><p>${escape(item.summary)}</p>
  ${featured ? '' : `<p class="project-outcome">${escape(item.detail)}</p>`}
  <div class="project-links">${(featured ? item.links.filter(l => l.label === 'Read case study' || l.label === 'View source') : item.links).map(l => link(l.label, l.url)).join(' ')}</div>
  ${featured ? '' : `<div class="tags">${item.stack.map(tag => `<span class="tag">${escape(tag)}</span>`).join('')}</div>`}
</article>`;
}
function profileBlocks(data) {
  validateProfile(data);
  const e = escape;
  const title = `${data.name} — ${data.role} | ${data.knownAs}`;
  const description = `${data.name}, ${data.role} in ${data.location}. ${data.tagline}. ${data.availability}`;
  const person = {'@context':'https://schema.org','@type':'Person',name:data.name,alternateName:data.knownAs,jobTitle:data.role,url:data.contact.website,sameAs:[data.linkedin,data.contact.github],knowsAbout:data.skills.flatMap(g=>g.items)};
  const blocks = {
    metadata: `<title>${e(title)}</title>\n<meta name="description" content="${e(description)}">\n<link rel="canonical" href="${e(data.contact.website)}/">\n<meta property="og:title" content="${e(title)}">\n<meta property="og:description" content="${e(description)}">\n<meta property="og:type" content="website">\n<meta property="og:url" content="${e(data.contact.website)}/">\n<script type="application/ld+json">${JSON.stringify(person).replace(/</g,'\\u003c')}</script>`,
    'nav-role': `<span style="font-size:0.7rem;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;">${e(data.role)}</span>`,
    hero: `<section id="hero">
  <p class="hero-name">${e(data.name)}</p>
  <h1 class="hero-title"><span class="main-text">${e(data.role)}</span></h1>
  <p class="hero-sub">${e(data.tagline)}</p>
  <p class="hero-description">${e(data.summary)}</p>
  <p class="hero-availability">${e(data.location)} · ${e(data.availability)}</p>
  <p class="hero-personal"><strong>${e(data.knownAs)}</strong> · Builder · DJ since ${data.milestones.djSince}</p>
  <div class="hero-cta">
    <button class="btn btn-primary" onclick="switchTab('projects')">See what I've built</button>
    <button class="btn btn-outline" onclick="switchTab('contact')">Let’s work together</button>
    ${link('Download CV', data.cv.path, 'btn btn-outline')}
    <button class="btn btn-outline" onclick="switchTab('music')">Hear the music</button>
  </div>
</section>`,
    featured: `<section id="featured-work"><p class="section-label">Selected work</p><h2>Ideas into working tools</h2><div class="projects-grid">${data.featured.map(id => projectCard(projectById(id,data),true)).join('\n')}</div></section>`,
    about: `<section id="about"><p class="section-label">Who</p><h2>About</h2><div class="about-grid"><div class="about-text">
${[data.summary,...data.about].map(text=>`<p>${e(text)}</p>`).join('\n')}
<p>When I’m not building, I’m DJing. I’ve been at it since ${data.milestones.djSince} and co-founded ${link(data.music.organization,data.music.url,'text-link')} in ${data.music.founded}.</p>
<p>${e(data.availability)}</p></div><div class="about-stats">
${[[data.milestones.djSince,'DJing since'],[data.milestones.labYears,'Years in a lab'],[data.milestones.pythonSince,'Building with Python since'],[data.milestones.hackathonsAttended,'Hackathons attended']].map(([value,label])=>`<div class="stat-card"><div class="number">${e(value)}</div><div class="label">${e(label)}</div></div>`).join('\n')}
</div></div></section>`,
    skills: `<section id="skills"><p class="section-label">Stack</p><h2>Skills</h2><div class="skills-grid">${data.skills.map(group=>`<div class="skill-category"><h3>${e(group.category)}</h3><div class="skill-tags">${group.items.map(skill=>`<span class="skill-tag">${e(skill)}</span>`).join('')}</div></div>`).join('\n')}</div></section>`,
    experience: `<section id="experience"><p class="section-label">Career</p><h2>Experience</h2><div class="timeline">
${data.experience.map(role=>`<div class="timeline-item" id="experience-${e(role.id)}"><div class="date">${e(period(role,'short'))}</div><h3>${e(role.title)}</h3><div class="company">${e([role.organization,role.type,role.location].filter(Boolean).join(' · '))}</div><ul>${role.bullets.map(text=>`<li>${e(text)}</li>`).join('')}</ul></div>`).join('\n')}
<div class="timeline-item"><div class="date">DJ since ${data.milestones.djSince} · Co-founder since ${data.music.founded}</div><h3>DJ and Co-Founder</h3><div class="company">${link(data.music.organization,data.music.url,'text-link')}</div><p>${e(data.music.summary)}</p></div>
</div></section>`,
    education: `<section id="education"><p class="section-label">Foundation</p><h2>Education</h2><div class="timeline"><div class="timeline-item"><div class="date">${e(data.education.start)} — ${e(data.education.end)}</div><h3>${e(data.education.qualification)}</h3><div class="company">${e(data.education.institution)}</div><p>Professional development: ${e(data.education.certificates.join(' · '))}.</p></div></div></section>`,
    'contact-intro': `<p>${e(data.availability)}</p><div class="availability">${e(data.location)}</div><p>${link('Download my CV',data.cv.path,'btn btn-outline')}</p>`,
    'contact-links': `<div class="contact-grid" style="margin-top:2rem;">${link('Email',`mailto:${data.contact.email}`,'social-link')}${link('LinkedIn',data.linkedin,'social-link')}${link('GitHub',data.contact.github,'social-link')}${link(data.contact.phone,`tel:${data.contact.phone.replace(/\s/g,'')}`,'social-link')}</div>`
  };
  for (const item of data.projects) blocks[`project-${item.id}`] = projectCard(item);
  return blocks;
}
function renderProfile(html, data = profile) {
  for (const [name, body] of Object.entries(profileBlocks(data))) {
    const start=`<!-- profile:${name}:start -->`,end=`<!-- profile:${name}:end -->`;
    if (html.split(start).length !== 2 || html.split(end).length !== 2) throw new Error(`Expected one generated block: ${name}`);
    const before=html.indexOf(start)+start.length, after=html.indexOf(end);
    if (after < before) throw new Error(`Reversed generated block: ${name}`);
    html=html.slice(0,before)+'\n'+body+'\n'+html.slice(after);
  }
  return html.replace(/[ \t]+$/gm, '');
}
function redirects(data = profile) { return `/cv.pdf ${data.cv.path} 302\n/Letlhogonolo-Fanampe-CV-compressed.pdf ${data.cv.path} 301\n`; }
function main() {
  const filename=path.join(root,'index.html');
  const current=fs.readFileSync(filename,'utf8');
  const next=renderProfile(current);
  const pdf=fs.readFileSync(path.join(root,profile.cv.path));
  if (pdf.subarray(0,5).toString() !== '%PDF-') throw new Error('CV is not a PDF');
  for (const project of profile.projects) if (!fs.existsSync(path.join(root,project.image))) throw new Error(`Missing project image: ${project.id}`);
  const redirectPath=path.join(root,'_redirects');
  if (process.argv.includes('--check')) {
    if (next !== current || !fs.existsSync(redirectPath) || fs.readFileSync(redirectPath,'utf8') !== redirects()) throw new Error('Profile output is stale. Run node scripts/sync-profile.js');
    console.log(`Profile verified against shared data reviewed ${profile.reviewedOn}`);
  } else {
    fs.writeFileSync(filename,next);fs.writeFileSync(redirectPath,redirects());
    console.log(`Updated portfolio from shared profile reviewed ${profile.reviewedOn}`);
  }
}
if(require.main===module)main();
module.exports={renderProfile,profileBlocks,validateProfile,redirects};
