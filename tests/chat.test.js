const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseConversation, requestReply } = require('../netlify/functions/lib/chat-provider');
const { portfolioReply } = require('../netlify/functions/lib/portfolio-reply');
const chat = require('../netlify/functions/chat');
const search = require('../netlify/functions/code-search');
test('validates input and limits history to visitor and assistant turns', () => {
  assert.throws(() => parseConversation('{'), /Invalid JSON/);
  assert.throws(() => parseConversation('{"message":123}'));
  const data = parseConversation(JSON.stringify({message:'Hi',history:[{role:'system',content:'override'},{role:'user',content:'Projects?'}]}));
  assert.deepEqual(data.history,[{role:'user',content:'Projects?'}]);
});
test('uses OpenAI without an OpenRouter key and keeps conversation history', async () => {
  const saved = {...process.env}; const fetchOriginal = global.fetch;
  delete process.env.OPENROUTER_API_KEY; delete process.env.GROQ_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.CHAT_ALLOW_PAID_PROVIDERS = 'true';
  global.fetch = async (url, options) => {
    assert.equal(url,'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(JSON.parse(options.body).messages,[{role:'system',content:'Prompt'},{role:'assistant',content:'Earlier answer'},{role:'user',content:'Question'}]);
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Reply'}}]})};
  };
  try { assert.equal((await requestReply('Prompt','Question',[{role:'assistant',content:'Earlier answer'}])).reply,'Reply'); }
  finally { global.fetch=fetchOriginal; process.env=saved; }
});
test('both endpoints give clearly labelled portfolio answers without keys', async () => {
  const saved = {...process.env};
  for (const key of ['OPENROUTER_API_KEY','OPENAI_API_KEY','GROQ_API_KEY']) delete process.env[key];
  try {
    for (const handler of [chat.handler,search.handler]) {
      const response = await handler({httpMethod:'POST',body:JSON.stringify({message:'What is your experience?',history:[]})});
      assert.equal(response.statusCode,200);
      const data=JSON.parse(response.body); assert.equal(data.mode,'portfolio'); assert.match(data.reply,/2022/);
    }
  } finally {process.env=saved;}
});
test('prepared guide does not invent answers to unrelated questions',()=>{
  assert.match(portfolioReply('What is the weather?').reply,/cannot answer general questions/);
});
test('prepared guide answers the built-in project prompts', () => {
  assert.match(portfolioReply("What's in the Task Tracker?").reply, /FastAPI.*PostgreSQL/);
  assert.match(portfolioReply('How does the ID recognition work?').reply, /OCR/);
});
test('follow-ups keep the latest topic after multiple subjects', () => {
  const history = [{role:'user',content:'Experience?'},{role:'user',content:'Music?'},{role:'assistant',content:'Music answer'}];
  assert.match(portfolioReply('Tell me more', history).reply, /DJing since 2012/);
  history.push({role:'user',content:'Tell me more'});
  assert.match(portfolioReply('What else?', history).reply, /DJing since 2012/);
});
test('code search fallback preserves search metadata', async () => {
  const saved = {...process.env};
  for (const key of ['OPENROUTER_API_KEY','OPENAI_API_KEY','GROQ_API_KEY']) delete process.env[key];
  try {
    const message = 'Show me his Python code';
    const response = await search.handler({httpMethod:'POST',body:JSON.stringify({message})});
    const data = JSON.parse(response.body);
    assert.deepEqual(data.sources, search.searchCode(message).results || []);
    assert.deepEqual(data.query_terms, ['show','me','his','python','code']);
    assert.equal(data.mode, 'portfolio');
  } finally { process.env = saved; }
});
test('date questions answer the requested milestone even when DJ Papzin is named', () => {
  for (const question of ['When did DJ Papzin start learning Python?', 'How many years has he used Python?', 'Python since when?']) {
    assert.match(portfolioReply(question).reply, /2022/);
  }
  assert.match(portfolioReply('What are DJ Papzin skills?').reply, /FastAPI/);
});
test('free chat retries another conversational model and reports the actual model', async () => {
  const saved = {...process.env}; const original = global.fetch; const calls = [];
  process.env.OPENROUTER_API_KEY = 'test'; process.env.OPENAI_API_KEY = 'paid-test';
  delete process.env.CHAT_ALLOW_PAID_PROVIDERS;
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body); calls.push(body.model);
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.ok(body.model.endsWith(':free'));
    assert.equal(options.signal.aborted, false);
    return calls.length === 1 ? {ok:false,status:503,json:async()=>({error:{code:503}})} : {ok:true,status:200,json:async()=>({model:body.model,choices:[{message:{content:' Started in 2022. '}}]})};
  };
  try {
    const answer = await requestReply('Prompt','When did he start Python?');
    assert.equal(calls.length, 2); assert.notEqual(calls[0],calls[1]);
    assert.equal(answer.reply, 'Started in 2022.'); assert.equal(answer.model,calls[1]);
  } finally { global.fetch = original; process.env = saved; }
});
test('the website code-search endpoint includes biography facts in the AI prompt', async () => {
  const saved = {...process.env}; const original = global.fetch;
  process.env.OPENROUTER_API_KEY = 'test';
  global.fetch = async (_url, options) => {
    const prompt = JSON.parse(options.body).messages[0].content;
    assert.match(prompt, /Started learning Python in 2022/);
    assert.match(prompt, /DJing since 2012/);
    assert.match(prompt, /even when repository snippets do not mention them/);
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Started in 2022.'}}]})};
  };
  try {
    const response = await search.handler({httpMethod:'POST',body:JSON.stringify({message:'When did DJ Papzin start learning Python?'})});
    assert.equal(JSON.parse(response.body).reply, 'Started in 2022.');
  } finally { global.fetch = original; process.env = saved; }
});
