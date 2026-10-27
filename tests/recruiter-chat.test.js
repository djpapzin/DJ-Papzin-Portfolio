const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profile, buildSystemPrompt } = require('../content/profile');
const search = require('../netlify/functions/code-search');
const chat = require('../netlify/functions/chat');
const questions = require('./fixtures/recruiter-questions.json');

for (const key of ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'CHAT_ALLOW_PAID_PROVIDERS']) delete process.env[key];

test('the recruiter conversation uses the profile and only retrieves its named technical project', () => {
  const file = (repo, content) => ({repo, name:'README.md', path:'README.md', summary:content, content, keywords:['projects','skills','salary','relocate']});
  const index = {files:[
    file('unrelated-repository', questions.join(' ')),
    file('agent-handoff-kit', 'Agent Handoff Kit is a local Python SQLite checkpoint recovery prototype. It is not production-ready.'),
  ]};
  // The irrelevant file really would match these queries if retrieval were ungated.
  assert.ok(search.searchCode(questions[2], 5, index).results.some(file=>file.repo==='unrelated-repository'));
  assert.ok(search.searchCode(questions[5], 5, index).results.some(file=>file.repo==='unrelated-repository'));
  const history = [];
  questions.forEach((message, indexInConversation) => {
    const result = search.searchConversation(message, history, index);
    if (indexInConversation === 3) {
      assert.deepEqual(result.results.map(file=>file.repo), ['agent-handoff-kit']);
      assert.match(result.context, /SQLite checkpoint recovery prototype/);
    } else {
      assert.deepEqual(result.results, [], message);
      assert.equal(result.context, '', message);
    }
    history.push({role:'user',content:message},{role:'assistant',content:'Earlier answer'});
  });
  assert.equal(search.codeQuery(questions[3], [{role:'user',content:'Tell me about Task Tracker'}]), questions[3]);
});

test('personal attribution and employer work skip code but implementation questions still retrieve', () => {
  for (const message of [
    'What was his contribution to TruthGuard?',
    'Which components of TruthGuard did he personally implement?',
    'Which are his strongest AI projects?',
    'What did DJ Papzin build at Kwantu?',
    'What is his notice period and expected compensation?',
  ]) assert.equal(search.shouldSearchCode(message), false, message);
  for (const message of [
    'How does TruthGuard classify news?',
    'Show me source code for his best AI projects',
    'What RAG projects has he built?',
    'How does TalentFlow Bot parse salary ranges?',
  ]) assert.equal(search.shouldSearchCode(message), true, message);
});

test('timeline grounding calculates overlaps from profile dates rather than assuming successive jobs', () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /Outlier and Kwantu: October 2024 to April 2025/);
  assert.match(prompt, /Kwantu and Translated: October 2024 to December 2024/);
  assert.match(prompt, /Freelance and Outlier: July 2024 to August 2025/);
  assert.match(prompt, /Next Sapien from December 2023 to January 2024\. Job title: AI\/ML Engineer — Computer Vision\./);
  const changed = structuredClone(profile);
  changed.experience.find(role=>role.id==='kwantu').start = '2026-01';
  changed.experience.find(role=>role.id==='kwantu').end = '2026-06';
  const updated = buildSystemPrompt(changed);
  assert.doesNotMatch(updated, /Outlier and Kwantu:|Kwantu and Translated:/);
  assert.match(updated, /Freelance and Kwantu: January 2026 to June 2026/);
});

test('confirmed project contributions follow shared profile edits and removal', () => {
  const changed = structuredClone(profile);
  changed.projects.find(project=>project.id==='truthguard').contribution = 'Confirmed responsibility: Example evaluation workflow.';
  assert.match(buildSystemPrompt(changed), /TruthGuard: Confirmed responsibility: Example evaluation workflow\./);
  changed.projects = changed.projects.filter(project=>project.id!=='truthguard');
  changed.featured = changed.featured.filter(id=>id!=='truthguard');
  assert.doesNotMatch(buildSystemPrompt(changed), /Confirmed responsibility: Example evaluation workflow/);
});

test('both AI endpoints receive attribution and overlap grounding while preserving conversation history', async () => {
  const saved = {...process.env}; const original = global.fetch;
  process.env.GROQ_API_KEY = 'test-key';
  const history = [{role:'user',content:questions[3]},{role:'assistant',content:'It is a local recovery prototype.'}];
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls++;
    const messages = JSON.parse(options.body).messages;
    assert.match(messages[0].content, /Describe overlapping roles as concurrent/);
    assert.match(messages[0].content, /TruthGuard: AI Specialist on the team/);
    assert.match(messages[0].content, /His specific individual tasks and the division of work are not documented/);
    assert.deepEqual(messages.slice(1,-1),history);
    return {ok:true,status:200,json:async()=>({model:'openai/gpt-oss-20b',choices:[{message:{content:'Salary and relocation preferences are not documented.'}}]})};
  };
  try {
    for (const handler of [chat.handler,search.handler]) {
      const result = JSON.parse((await handler({httpMethod:'POST',body:JSON.stringify({message:questions[5],history})})).body);
      assert.equal(result.mode,'ai');
      if (handler===search.handler) assert.deepEqual(result.sources,[]);
    }
    assert.equal(calls,2);
  } finally {process.env=saved;global.fetch=original;}
});
