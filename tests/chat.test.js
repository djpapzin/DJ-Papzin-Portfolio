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
    assert.deepEqual(JSON.parse(response.body).sources, []);
  } finally { global.fetch = original; process.env = saved; }
});
test('skills questions about learning are not milestone questions and explicit DJ intent works', () => {
  assert.match(portfolioReply('Which Python technologies did he learn?').reply, /FastAPI/);
  assert.match(portfolioReply('Is he a DJ?').reply, /2012/);
  assert.match(portfolioReply('When did he become a DJ?').reply, /2012/);
});
test('slow free attempts reserve time for opted-in paid fallback', async () => {
  const saved = {...process.env}; const original = global.fetch; const originalNow = Date.now;
  let now = 100000; const urls = [];
  Date.now = () => now;
  process.env.OPENROUTER_API_KEY = 'free'; process.env.OPENAI_API_KEY = 'paid';
  delete process.env.GROQ_API_KEY; process.env.CHAT_ALLOW_PAID_PROVIDERS = 'true';
  global.fetch = async (url) => {
    urls.push(url);
    if (url.includes('openrouter')) { now += 5000; throw new Error('Timed out'); }
    return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Paid backup'}}]})};
  };
  try {
    assert.equal((await requestReply('Prompt','Question')).reply,'Paid backup');
    assert.equal(urls.length,3);
  } finally { global.fetch = original; Date.now = originalNow; process.env = saved; }
});
test('direct project prompts search real code while biography questions skip irrelevant files', () => {
  for (const question of ["What's in the Task Tracker?", 'Tell me about PapzinAI', 'What RAG projects has he built?', 'How does the ID recognition work?']) assert.equal(search.shouldSearchCode(question),true);
  for (const question of ['When did DJ Papzin start learning Python?', 'What skills do you have?', 'When did he start DJing?']) assert.equal(search.shouldSearchCode(question),false);
});
test('Python certificate and employer durations do not invent learning dates', () => {
  assert.match(portfolioReply('When did he earn his Python certificate?').reply, /does not provide its date/);
  assert.match(portfolioReply('How long did he use Python at Kwantu?').reply, /October 2024 to April 2025/);
});
test('implementation follow-ups retain the most recent project topic', () => {
  const history = [{role:'user',content:'Tell me about PapzinAI'}];
  for (const question of ['How is authentication handled?', 'Does it support authentication?', 'How does it work?']) {
    assert.match(search.codeQuery(question, history), /PapzinAI/);
  }
  history.push({role:'user',content:'When did he start Python?'});
  assert.equal(search.shouldSearchCode(search.codeQuery('Tell me more',history)),false);
  assert.doesNotMatch(search.codeQuery('Tell me more',history), /PapzinAI/);
});
test('all project names remain searchable and supported short follow-ups keep their subject', () => {
  for (const name of ['Arc-ZARDIAN', 'RecallFlow', 'mindmate', 'Comment-Scope', 'ChatSnap-Extractor', 'RAG-SQL-Chatbot']) assert.equal(search.shouldSearchCode(`Tell me about ${name}`),true);
  const history = [{role:'user',content:'What database does Arc-ZARDIAN use?'}];
  assert.match(search.codeQuery('Can you explain?',history), /Arc-ZARDIAN/);
  assert.match(search.codeQuery('And that?',history), /Arc-ZARDIAN/);
  history.push({role:'user',content:'How is authentication handled?'});
  assert.match(search.codeQuery('Tell me more',history), /Arc-ZARDIAN/);
});
test('explicit project names override biography words and pronouns', () => {
  assert.equal(search.shouldSearchCode('What skills does Arc-ZARDIAN use?'),true);
  assert.equal(search.shouldSearchCode('How does Papzin & Crew stream music?'),true);
  for (const question of ['What is this Task Tracker?', 'What does this Arc-ZARDIAN project do?']) {
    assert.match(search.codeQuery('Can you explain?',[{role:'user',content:question}]), /Task Tracker|Arc-ZARDIAN/);
  }
});
test('subject-less technical questions inherit the latest project without special phrasing', () => {
  const history = [{role:'user',content:'Tell me about Task Tracker'}];
  for (const question of ['What authentication method is used?', 'Which framework handles requests?', 'What database is used?', 'Can you explain?']) assert.match(search.codeQuery(question,history), /Task Tracker/);
  history.push({role:'user',content:'Tell me about Arc-ZARDIAN'});
  assert.match(search.codeQuery('What authentication method is used?',history),/Arc-ZARDIAN/);
  assert.doesNotMatch(search.codeQuery('What authentication method is used?',history),/Task Tracker/);
});
test('named project retrieval cannot cite another project with stronger generic keyword matches', () => {
  const index = {files:[
    {repo:'PapzinAI-Task-Tracker',name:'tasks.py',path:'tasks.py',summary:'Task storage',content:'PostgreSQL database tasks',keywords:['database']},
    {repo:'Arc-ZARDIAN',name:'database.py',path:'database.py',summary:'database database tasks',content:'database database database database',keywords:['database','task','tracker']},
  ]};
  const results = search.searchCode('What database does Task Tracker use?',5,index).results;
  assert.equal(results.length,1); assert.equal(results[0].repo,'PapzinAI-Task-Tracker');
  assert.deepEqual(search.searchCode('What database does VisualPro use?',5,index).results,[]);
});
test('new broad portfolio questions do not inherit a prior project', () => {
  const history = [{role:'user',content:'Tell me about Task Tracker'}];
  for (const question of ['What RAG projects has he built?', 'Tell me about his RAG work', 'What repositories does he have?']) assert.equal(search.codeQuery(question,history),question);
  assert.doesNotMatch(portfolioReply('When did he start learning Python?').reply,/professional AI work began/);
});
test('broad project topics remain the subject for their immediate follow-ups', () => {
  const history = [{role:'user',content:'Tell me about Task Tracker'},{role:'user',content:'What RAG projects has he built?'}];
  const query = search.codeQuery('How are they implemented?',history);
  assert.match(query,/RAG projects/); assert.doesNotMatch(query,/Task Tracker/);
});
test('PapzinAI is distinct from Task Tracker and comparison queries can retrieve both sides', () => {
  const index = {files:[
    {repo:'PapzinAI-Task-Tracker',name:'tasks.py',path:'tasks.py',summary:'tasks database',content:'Task Tracker database',keywords:['task','tracker','database']},
    {repo:'RAG-SQL-Chatbot',name:'rag.py',path:'rag.py',summary:'RAG database',content:'RAG database',keywords:['rag','database']},
  ]};
  assert.deepEqual(search.searchCode('How does PapzinAI orchestrate agents?',5,index).results,[]);
  const results = search.searchCode('Compare Task Tracker with his other RAG projects',5,index).results;
  assert.ok(results.some(file=>file.repo==='PapzinAI-Task-Tracker'));
  assert.ok(results.some(file=>file.repo==='RAG-SQL-Chatbot'));
});
test('spaced and compact project names identify a new topic independently of capitalization', () => {
  const history = [{role:'user',content:'Tell me about Task Tracker'}];
  for (const question of ['How does Truth Guard work?', 'How does Recall Flow work?', 'How does truthguard work?', 'Tell me about Papzin AI']) assert.equal(search.codeQuery(question,history),question);
  const index={files:[{repo:'TruthGuard-AI-Fake-News-Detection-with-LLM',name:'detect.py',path:'detect.py',summary:'fake news',content:'detect fake news',keywords:['fake','news']}]};
  assert.equal(search.searchCode('How does Truth Guard detect fake news?',5,index).results[0].repo,'TruthGuard-AI-Fake-News-Detection-with-LLM');
});
test('standalone topic switches never inherit an earlier named project', () => {
  const history=[{role:'user',content:'Tell me about Task Tracker'}];
  for (const message of ['Explain Docker','Tell me about RAG','What is the weather?','What database does Django use?']) {
    assert.equal(search.codeQuery(message,history),message);
    const followUp=search.codeQuery('Can you explain?',[...history,{role:'user',content:message}]);
    assert.match(followUp,new RegExp(message.replace(/[?.]/g,'')));
    assert.doesNotMatch(followUp,/Task Tracker/);
  }
  assert.match(search.codeQuery('Does it use Docker?',history),/Task Tracker/);
});
test('prepared answers include the Next Sapien interval directly and in the overall timeline', () => {
  for (const message of ['When did he work at Next Sapien?', 'Tell me about his Next Sapien experience', 'What is his experience?']) assert.match(portfolioReply(message).reply,/Next Sapien.*December 2023 to January 2024/);
});
test('difference phrasing retrieves unnamed peer projects for comparisons', () => {
  const index = {files:[
    {repo:'PapzinAI-Task-Tracker',name:'tasks.py',path:'tasks.py',summary:'database tasks',content:'Task Tracker database',keywords:['task','tracker']},
    {repo:'RAG-SQL-Chatbot',name:'rag.py',path:'rag.py',summary:'RAG database',content:'RAG database',keywords:['rag']},
  ]};
  for (const message of ['How does Task Tracker differ from his RAG projects?', 'What are the differences between Task Tracker and his RAG projects?', 'How is Task Tracker similar to his RAG projects?', 'How is Task Tracker compared with his RAG projects?']) assert.ok(search.searchCode(message,5,index).results.some(file=>file.repo==='RAG-SQL-Chatbot'));
});
test('NextSapien project questions use facial-analysis facts rather than the employment answer', () => {
  for (const question of ['What technologies does the NextSapien Facial Analysis project use?', 'Tell me about the NextSapien project']) {
    assert.match(portfolioReply(question).reply,/Python and DeepFace/);
    assert.doesNotMatch(portfolioReply(question).reply,/ChatSnap|December 2023/);
  }
});
test('explicitly named comparisons exclude unrelated files and retain both available sides', () => {
  const file=(repo,name,content)=>({repo,name,path:name,content,summary:'',keywords:['database']});
  const index={files:[...Array.from({length:6},(_,i)=>file('PapzinAI-Task-Tracker',`tasks${i}.py`,'database Task Tracker Task Tracker')),file('Arc-ZARDIAN','arc.py','database'),file('RAG-SQL-Chatbot','other.py','database Task Tracker Arc ZARDIAN')]};
  const results=search.searchCode('Compare Task Tracker and Arc-ZARDIAN database choices',5,index).results;
  assert.ok(results.some(item=>item.repo==='PapzinAI-Task-Tracker'));
  assert.ok(results.some(item=>item.repo==='Arc-ZARDIAN'));
  assert.ok(results.every(item=>['PapzinAI-Task-Tracker','Arc-ZARDIAN'].includes(item.repo)));
});
test('written conjunction aliases and prepared employer duration questions stay grounded', () => {
  const history=[{role:'user',content:'Task Tracker?'}];
  const question='What database does Papzin and Crew use?';
  assert.equal(search.codeQuery(question,history),question);
  const index={files:[{repo:'PapzinCrew-Music-Streaming-Platform',name:'db.py',path:'db.py',summary:'database',content:'database',keywords:['database']}]};
  assert.equal(search.searchCode(question,5,index).results[0].repo,'PapzinCrew-Music-Streaming-Platform');
  assert.match(portfolioReply('How long did he work at Translated?').reply,/Translated from October 2024 to December 2024/);
});
test('personal-pronoun technical follow-ups keep the project while broad topics remain independent', () => {
  const history=[{role:'user',content:'Tell me about Task Tracker'}];
  assert.match(search.codeQuery('What did he use for authentication?',history),/Task Tracker/);
  assert.match(search.codeQuery('How did he build it?',history),/Task Tracker/);
  const question='What RAG projects has he built?';
  assert.equal(search.codeQuery(question,history),question);
});
test('work performed at Next Sapien is distinct from its named Facial Analysis project', () => {
  assert.match(portfolioReply('What project did he build at Next Sapien?').reply,/ChatSnap-Extractor/);
  assert.match(portfolioReply('What technologies does the NextSapien Facial Analysis project use?').reply,/DeepFace/);
});

test('cross-turn comparisons retrieve both named subjects and listings include other projects', () => {
  const history=[{role:'user',content:'Tell me about Task Tracker'}];
  const query=search.codeQuery('How does it differ from Arc-ZARDIAN?',history);
  assert.match(query,/Task Tracker/);
  assert.match(query,/Arc-ZARDIAN/);
  const file=(repo)=>({repo,name:'api.py',path:'api.py',summary:'FastAPI',content:`FastAPI database ${repo==='Arc-ZARDIAN'?'Arc-ZARDIAN':'Task Tracker'}`,keywords:['fastapi','database']});
  const index={files:[file('PapzinAI-Task-Tracker'),file('Arc-ZARDIAN'),file('RAG-SQL-Chatbot')]};
  const comparison=search.searchCode(query,5,index).results;
  assert.ok(comparison.some(x=>x.repo==='PapzinAI-Task-Tracker'));
  assert.ok(comparison.some(x=>x.repo==='Arc-ZARDIAN'));
  assert.ok(comparison.every(x=>x.repo!=='RAG-SQL-Chatbot'));
  for (const question of ['Which projects use FastAPI besides Task Tracker?', 'Which other projects use FastAPI apart from Task Tracker?']) assert.ok(search.searchCode(question,5,index).results.some(x=>x.repo==='RAG-SQL-Chatbot'));
});

test('possessive named comparisons and integration follow-ups ground both projects', () => {
  const file=(repo,content)=>({repo,name:'api.py',path:'api.py',summary:'database integration',content,keywords:['database','integration']});
  const index={files:[file('PapzinAI-Task-Tracker','Task Tracker'),file('Arc-ZARDIAN','Arc-ZARDIAN'),...Array.from({length:6},()=>file('RAG-SQL-Chatbot','Task Tracker Arc-ZARDIAN Task Tracker Arc-ZARDIAN'))]};
  for (const query of ['Compare his projects Task Tracker and Arc-ZARDIAN',search.codeQuery('Does it integrate with Arc-ZARDIAN?',[{role:'user',content:'Tell me about Task Tracker'}])]) {
    const result=search.searchCode(query,5,index).results;
    assert.ok(result.some(x=>x.repo==='PapzinAI-Task-Tracker'));
    assert.ok(result.some(x=>x.repo==='Arc-ZARDIAN'));
    assert.ok(result.every(x=>x.repo!=='RAG-SQL-Chatbot'));
  }
});

test('employer milestone questions skip repository snippets while implementation questions search', () => {
  for (const employer of ['Translated','Outlier','Kwantu','Next Sapien','Afrisam']) {
    for (const question of [`When did he work at ${employer}?`,`How long did he work at ${employer}?`,`When did he join ${employer}?`]) assert.equal(search.shouldSearchCode(question),false);
  }
  assert.equal(search.shouldSearchCode('What code did he build at Next Sapien?'),true);
});

test('explicit facial-analysis implementation intent and professional Python dates stay distinct', () => {
  assert.equal(search.shouldSearchCode('What was his experience implementing the NextSapien Facial Analysis project?'),true);
  assert.match(portfolioReply('When did he start using Python professionally?').reply,/professional Python.*December 2023/);
  assert.match(portfolioReply('When did he start learning Python?').reply,/2022/);
});

test('professional skills and technical uses of company-like words retain their intent', () => {
  assert.match(portfolioReply('What professional Python skills does he have?').reply,/FastAPI.*LangChain/);
  assert.match(portfolioReply('What professional Python projects has he built?').reply,/Task Tracker.*TruthGuard/);
  assert.equal(search.shouldSearchCode('How long are translated database records stored?'),true);
  assert.equal(search.shouldSearchCode('When did he work at Translated?'),false);
});

test('single-project integrations stay scoped and employer-qualified dates use their own interval', () => {
  const file=(repo,content)=>({repo,name:'api.py',path:'api.py',summary:'integration',content,keywords:['slack','integration']});
  const index={files:[file('PapzinAI-Task-Tracker','Task Tracker Slack'),file('Arc-ZARDIAN','Slack Slack integrate integrate')]};
  assert.ok(search.searchCode('Does Task Tracker integrate with Slack?',5,index).results.every(x=>x.repo==='PapzinAI-Task-Tracker'));
  assert.match(portfolioReply('When did he use Python professionally at Kwantu?').reply,/Kwantu from October 2024 to April 2025/);
});

test('Python project timeline questions answer the milestone rather than the project catalog', () => {
  for (const question of ['When did he start building Python projects?','How long has he built projects with Python?']) assert.match(portfolioReply(question).reply,/2022/);
  assert.match(portfolioReply('What Python projects has he built?').reply,/Task Tracker.*TruthGuard/);
});

test('prepared guide treats technical translated and outlier wording as unsupported questions', () => {
  for (const question of ['How are translated database records stored?','How do outliers affect machine-learning models?']) assert.doesNotMatch(portfolioReply(question).reply,/RLHF|Kwantu|Next Sapien/);
  assert.match(portfolioReply('When did he work at Translated?').reply,/October 2024 to December 2024/);
});

test('application collections and indefinite feature names do not add unrelated repositories', () => {
  const file=(repo,content)=>({repo,name:'api.py',path:'api.py',summary:'projects task tracker',content,keywords:['projects','task','tracker']});
  const index={files:[file('PapzinAI-Task-Tracker','Task Tracker projects'),file('Arc-ZARDIAN','Arc-ZARDIAN task tracker projects')]};
  assert.ok(search.searchCode('How does Task Tracker retrieve all user projects?',5,index).results.every(x=>x.repo==='PapzinAI-Task-Tracker'));
  assert.ok(search.searchCode('Does Arc-ZARDIAN include a task tracker?',5,index).results.every(x=>x.repo==='Arc-ZARDIAN'));
});

test('demonstratives modifying an explicit new project do not create a comparison', () => {
  const history=[{role:'user',content:'Tell me about Task Tracker'}];
  for (const question of ['What does this Arc-ZARDIAN project do?','Tell me about that Truth Guard project']) assert.equal(search.codeQuery(question,history),question);
  assert.match(search.codeQuery('How does this compare with Arc-ZARDIAN?',history),/Task Tracker/);
});

test('Next Sapien implementation work is scoped to the known ChatSnap repository', () => {
  const file=(repo,content)=>({repo,name:'main.py',path:'main.py',summary:'code build',content,keywords:['code','build']});
  const index={files:[file('ChatSnap-Extractor','ChatSnap code'),file('NextSapien-Facial-Analysis','Next Sapien code build build')]};
  const result=search.searchCode('What code did he build at Next Sapien?',5,index).results;
  assert.ok(result.length>0);
  assert.ok(result.every(x=>x.repo==='ChatSnap-Extractor'));
});

test('Next Sapien relationships keep explicitly named peers and Kwantu tools answer duties', () => {
  const file=(repo,content)=>({repo,name:'api.py',path:'api.py',summary:'project integration',content,keywords:['project','integration']});
  const index={files:[file('ChatSnap-Extractor','ChatSnap project'),file('PapzinAI-Task-Tracker','Task Tracker project')]};
  const result=search.searchCode('Does the project he built at Next Sapien integrate with Task Tracker?',5,index).results;
  assert.ok(result.some(x=>x.repo==='ChatSnap-Extractor'));
  assert.ok(result.some(x=>x.repo==='PapzinAI-Task-Tracker'));
  assert.match(portfolioReply('What technologies did he use at Kwantu?').reply,/LangChain.*FastAPI.*Detectron2.*Tesseract/);
});

test('comparisons with a technology keep the named project as the code source', () => {
  const file=(repo,content)=>({repo,name:'api.py',path:'api.py',summary:'Django',content,keywords:['django']});
  const index={files:[file('PapzinAI-Task-Tracker','Task Tracker Django'),file('Arc-ZARDIAN','Django Django Django')]};
  const result=search.searchCode('Compare Task Tracker with Django',5,index).results;
  assert.ok(result.length>0);
  assert.ok(result.every(x=>x.repo==='PapzinAI-Task-Tracker'));
});

test('Kwantu build questions answer its recorded work and identity prompts skip code retrieval', () => {
  assert.match(portfolioReply('What did he build at Kwantu?').reply,/LangChain.*Detectron2.*Telegram/);
  for (const question of ['Who is DJ Papzin?','Where is he based?','Tell me about his background']) assert.equal(search.shouldSearchCode(question),false);
});

test('Python startup questions do not get a learning date and phone requests skip code', () => {
  for (const question of ['How does he start the Python backend?','How is the Python server started?','How do I restart Python?']) assert.doesNotMatch(portfolioReply(question).reply,/2022/);
  assert.match(portfolioReply('When did he start learning Python?').reply,/2022/);
  for (const question of ['What is his phone number?','How can I reach him?']) assert.equal(search.shouldSearchCode(question),false);
});

test('generic technical music-platform questions search the streaming repository', () => {
  const file=(repo)=>({repo,name:'app.py',path:'app.py',summary:'music technology stack',content:'music technology stack',keywords:['technology','stack']});
  const index={files:[file('PapzinCrew-Music-Streaming-Platform'),file('Arc-ZARDIAN')]};
  for (const question of ['What technology powers his music streaming platform?','What stack does his music site use?']) {
    assert.equal(search.shouldSearchCode(question),true);
    assert.ok(search.searchCode(question,5,index).results.every(x=>x.repo==='PapzinCrew-Music-Streaming-Platform'));
  }
});
test('a model-specific forbidden response retries the next free model', async () => {
  const saved={...process.env}; const original=global.fetch; let calls=0;
  process.env.OPENROUTER_API_KEY='test'; delete process.env.CHAT_ALLOW_PAID_PROVIDERS;
  global.fetch=async()=>++calls===1?{ok:false,status:403,json:async()=>({error:{code:403}})}:{ok:true,status:200,json:async()=>({choices:[{message:{content:'Reply'}}]})};
  try { assert.equal((await requestReply('Prompt','Question')).reply,'Reply'); assert.equal(calls,2); }
  finally { process.env=saved; global.fetch=original; }
});

test('runtime timing and descriptive feature aliases do not become portfolio milestones or peers', () => {
  for (const question of ['When does the Python backend refresh its cache?','When is the Python API available?']) assert.doesNotMatch(portfolioReply(question).reply,/2022/);
  const file=(repo,content)=>({repo,name:'app.py',path:'app.py',summary:'comment scope',content,keywords:['comment','scope']});
  const index={files:[file('Arc-ZARDIAN','Arc-ZARDIAN comment scope'),file('Comment-Scope','Comment-Scope comment scope')]};
  assert.ok(search.searchCode('Does Arc-ZARDIAN limit comment scope?',5,index).results.every(x=>x.repo==='Arc-ZARDIAN'));
  assert.ok(search.searchCode('Compare Arc-ZARDIAN and Comment-Scope',5,index).results.some(x=>x.repo==='Comment-Scope'));
});

test('lowercase explicit identifiers remain scoped while generic feature wording stays excluded', () => {
  const file=(repo,content)=>({repo,name:'app.py',path:'app.py',summary:'comment scope',content,keywords:['comment','scope']});
  const index={files:[file('Arc-ZARDIAN','arc-zardian comment scope'),file('Comment-Scope','comment scope')]};
  const result=search.searchCode('Does arc-zardian limit comment scope?',5,index).results;
  assert.ok(result.length>0);
  assert.ok(result.every(x=>x.repo==='Arc-ZARDIAN'));
});

test('VisualPro award questions identify its documented event rather than the generic project list', () => {
  assert.match(portfolioReply('Which hackathon did VisualPro win?').reply, /first place at the WebGPU Hackathon/);
  assert.match(portfolioReply('Tell me about his hackathon wins').reply, /VisualPro won the WebGPU Hackathon/);
  assert.doesNotMatch(portfolioReply('Tell me about his hackathon wins').reply, /three/);
});
