const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { profile, buildSystemPrompt, experienceAnswer, skillsAnswer, contactAnswer, projectAnswer } = require('../content/profile');
const { renderProfile, redirects } = require('../scripts/sync-profile');
const { portfolioReply } = require('../netlify/functions/lib/portfolio-reply');
const { SYSTEM_PROMPT } = require('../netlify/functions/lib/portfolio-prompt');
const chat = require('../netlify/functions/chat');
const search = require('../netlify/functions/code-search');
for (const key of ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'CHAT_ALLOW_PAID_PROVIDERS', 'CHAT_GROQ_FREE_TIER']) delete process.env[key];
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');

test('deployed page and redirects match the approved shared profile', () => {
  assert.equal(html, renderProfile(html));
  assert.equal(fs.readFileSync(path.join(root,'_redirects'),'utf8'),redirects());
  assert.equal(SYSTEM_PROMPT,buildSystemPrompt());
  assert.doesNotMatch(html, /<h1[^>]*>.*AI\/ML Engineer/);
  assert.equal((html.match(/id="experience-freelance"/g)||[]).length,1);
  assert.doesNotMatch(html,/2025 — Present|Jul 2024 — 2025/);
  const featured=html.split('<!-- profile:featured:start -->')[1].split('<!-- profile:featured:end -->')[0];
  const names=[...featured.matchAll(/<h3>(.*?)<\/h3>/g)].map(match=>match[1]);
  assert.deepEqual(names,['Agent Handoff Kit','AgentOps Mobile Command Center','TruthGuard']);
});

test('a profile edit flows to page, model grounding and prepared biography answers', () => {
  const changed=structuredClone(profile);
  changed.role='AI Integration Engineer';changed.location='Example City';changed.availability='Available from December for remote work.';
  changed.experience.find(role=>role.id==='outlier').end='2025-09';
  changed.skills[1].items.push('Example Integration Tool');
  changed.projects.find(project=>project.id==='agentops').summary='Changed project summary for the synchronization test.';
  changed.featured.reverse();
  const page=renderProfile(html,changed), prompt=buildSystemPrompt(changed);
  for(const text of [changed.role,changed.location,changed.availability,'Example Integration Tool','Changed project summary for the synchronization test.']) {
    assert.ok(page.includes(text),text);assert.ok(prompt.toLowerCase().includes(text.toLowerCase()),text);
  }
  assert.match(page,/Jul 2024 — Sept 2025/);
  assert.match(experienceAnswer(changed),/Outlier from July 2024 to September 2025/);
  assert.match(skillsAnswer(changed),/Example Integration Tool/);
  assert.match(contactAnswer(changed),/Available from December/);
});

test('both chatbot endpoints answer the verified title, dates, skills, availability and CV without a provider', async () => {
  const saved={...process.env};
  for(const key of ['OPENROUTER_API_KEY','OPENAI_API_KEY','GROQ_API_KEY'])delete process.env[key];
  try {
    const cases=[
      ['Who is DJ Papzin?', /AI Solutions Engineer.*Pretoria/],
      ['When did he work at Outlier?', /Outlier from July 2024 to August 2025/],
      ['When did he start freelancing?', /Freelance from February 2024 to Present/],
      ['What was his start date at Kwantu?', /Kwantu from October 2024 to April 2025/],
      ['Was his Outlier role remote?', /Outlier.*July 2024 to August 2025.*Remote/],
      ['What was his start date at Next Sapien?', /Next Sapien from December 2023 to January 2024/],
      ['Was his NextSapien role remote?', /Next Sapien.*December 2023.*Remote/],
      ['What CV projects has he built?', /ChatSnap-Extractor/],
      ['What are his skills?', /FastAPI.*SQL.*Docker/],
      ['Is he available for work?', /Available immediately.*remote and hybrid/],
      ['Can he start immediately?', /Available immediately/],
      ['Does he work remote or hybrid?', /remote and hybrid/],
      ['Where can I download his CV?', /AI-Solutions-Engineer-CV\.pdf/]
    ];
    for(const handler of [chat.handler,search.handler])for(const [message,expected] of cases) {
      const response=await handler({httpMethod:'POST',body:JSON.stringify({message})});
      assert.equal(response.statusCode,200);
      const result=JSON.parse(response.body);assert.equal(result.mode,'portfolio');assert.match(result.reply,expected,message);
      if (handler === search.handler && message === 'What CV projects has he built?') assert.deepEqual(result.sources, []);
    }
  } finally {process.env=saved;}
});

test('computer-vision overviews skip unrelated code while implementation questions still retrieve', () => {
  assert.equal(search.shouldSearchCode('What CV projects has he built?'), false);
  assert.equal(search.shouldSearchCode('Tell me about his computer vision experience'), false);
  assert.equal(search.shouldSearchCode('Show me source code for his CV projects'), true);
  assert.equal(search.shouldSearchCode('How do his computer vision projects work?'), true);
  assert.equal(search.shouldSearchCode('What computer vision work does ChatSnap-Extractor do?'), true);
});

test('changing featured projects preserves every other project in model grounding', () => {
  const changed = structuredClone(profile);
  changed.featured = ['agent-handoff', 'truthguard', 'vocal-thread'];
  const prompt = buildSystemPrompt(changed);
  for (const project of changed.projects) assert.ok(prompt.includes(project.detail), project.id);
  assert.equal(prompt.split(changed.projects.find(project => project.id === 'vocal-thread').detail).length, 2);
});

test('adding, removing and reordering profile projects updates the page and chatbot together', () => {
  const changed = structuredClone(profile);
  changed.projects = changed.projects.filter(project => !['agentops', 'vocal-thread'].includes(project.id));
  changed.projects.reverse();
  changed.projects.push({...structuredClone(changed.projects[0]), id:'new-project', name:'New Profile Project', summary:'A new approved project.', detail:'Distinct new project details.'});
  changed.featured = ['new-project', 'truthguard'];
  const page = renderProfile(html, changed);
  const prompt = buildSystemPrompt(changed);
  assert.doesNotMatch(page, /id="project-(agentops|vocal-thread)"/);
  const projects = page.split('<!-- profile:projects:start -->')[1].split('<!-- profile:projects:end -->')[0];
  assert.deepEqual([...projects.matchAll(/id="project-([^"]+)"/g)].map(match => match[1]), changed.projects.map(project => project.id));
  assert.ok(prompt.includes('Distinct new project details.'));
  assert.doesNotMatch(prompt, /Connects a FastAPI dashboard/);
  assert.match(projectAnswer('agentops', changed), /not include.*summary/i);
});

test('one skill group remains valid and uses the same ordering on the page and chatbot', () => {
  const changed = structuredClone(profile);
  changed.skills = [{category:'Core skills', items:['Python', 'FastAPI', 'SQL']}];
  assert.match(renderProfile(html, changed), /Python<\/span><span class="skill-tag">FastAPI/);
  assert.match(buildSystemPrompt(changed), /Python, FastAPI, SQL/);
});

test('model-backed endpoints receive the same approved profile facts', async () => {
  const saved={...process.env},originalFetch=global.fetch;let calls=0;
  process.env.OPENROUTER_API_KEY='test';
  global.fetch=async(_url,options)=>{
    calls++;
    const prompt=JSON.parse(options.body).messages[0].content;
    assert.ok(prompt.includes(SYSTEM_PROMPT));
    assert.match(prompt,/AI Solutions Engineer/);assert.match(prompt,/Outlier from July 2024 to August 2025/);
    assert.match(prompt,/Freelance from February 2024 to Present/);assert.match(prompt,/AI-Solutions-Engineer-CV\.pdf/);
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Grounded test response'}}]})};
  };
  try {for(const handler of [chat.handler,search.handler])await handler({httpMethod:'POST',body:JSON.stringify({message:'Who is DJ Papzin?'})});assert.equal(calls,2);}
  finally {global.fetch=originalFetch;process.env=saved;}
});

test('profile builds fail for missing blocks, invalid dates and missing featured projects', () => {
  assert.throws(()=>renderProfile(html.replace('<!-- profile:hero:start -->','')),/Expected one generated block/);
  const bad=structuredClone(profile);bad.experience[0].start='2024-13';
  assert.throws(()=>renderProfile(html,bad),/Invalid profile month/);
  bad.experience[0].start='2024-02';bad.featured.push('missing-project');
  assert.throws(()=>renderProfile(html,bad),/Missing profile project/);
});

test('profile markup escapes content and the downloadable CV exists', () => {
  const changed=structuredClone(profile);changed.role='<script>alert("test")</script>';
  const page=renderProfile(html,changed);
  assert.doesNotMatch(page,/<script>alert\("test"\)/);
  assert.match(page,/&lt;script&gt;/);
  assert.equal(fs.readFileSync(path.join(root,profile.cv.path)).subarray(0,5).toString(),'%PDF-');
  assert.ok(html.includes(`href="${profile.cv.path}"`));
  assert.ok(portfolioReply('Send me your CV').reply.includes(profile.cv.path));
});
