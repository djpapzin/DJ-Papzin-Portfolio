// Grounded portfolio answers; no AI provider or API key is required.
function portfolioReply(message, history = []) {
  const text = message.toLowerCase();
  const isFollowUp = value => /^(tell me more|more|what else|and that|can you explain)[?.! ]*$/.test(value.trim());
  const previous = [...history].reverse().find(turn => turn.role === 'user' && !isFollowUp(turn.content.toLowerCase()));
  const topic = isFollowUp(text) ? (previous?.content.toLowerCase() || text) : text;
  const employerContext = /\b(?:at|for|with|join(?:ed)?)\s+(?:translated|outlier(?:\.ai)?|kwantu|afrisam)\b|\b(?:translated|outlier|kwantu|afrisam)(?:\.ai)?(?:'s)?\s+(?:role|employment|job|work|experience|career)\b/.test(topic);
  const pythonMilestone = /\b(learn(?:ing|ed)?|build(?:ing)?|built|projects?|profession\w*|since|how long|how many years|start(?:ed)?|began|begin)\b/.test(topic) && !/\b(backend|server|api|cache|runtime|restart)\b/.test(topic);
  let reply;
  const nextSapienWork = 'Letlhogonolo worked remotely at Next Sapien as an AI/ML Engineer in computer vision from December 2023 to January 2024. He developed automated image analysis and built ChatSnap-Extractor to extract text and timestamps from chat screenshots.';
  if (/\bchatsnap(?:-extractor)?\b/.test(topic)) {
    reply = 'ChatSnap-Extractor uses Django, YOLO and PaddleOCR to extract messages, timestamps and emojis from chat screenshots. Its repository includes sample inputs and structured outputs. Open its Projects card for the examples and source code.';

  } else if (/\b(at|for|with)\s+next\s*sapien/.test(topic) && !/facial|deepface/.test(topic)) {
    reply = nextSapienWork;
  } else if (/next\s*sapien/.test(topic) && /facial|deepface|project|technolog|stack|code|system/.test(topic)) {
    reply = 'NextSapien Facial Analysis is a facial analysis project built with Python and DeepFace for facial attribute recognition. Its repository is github.com/djpapzin/NextSapien-Facial-Analysis.';
  } else if (/next\s*sapien/.test(topic)) {
    reply = nextSapienWork;
  } else if (pythonMilestone && /python/.test(topic) && /profession|on the job|for work|at work/.test(topic) && /\b(when|since|how long|how many years|what year|which year|date)\b/.test(topic) && !/kwantu|outlier|translated|afrisam/.test(topic)) {
    reply = 'He began learning Python in 2022. His recorded professional Python work includes building ChatSnap-Extractor at Next Sapien from December 2023 to January 2024.';
  } else if (/python/.test(topic) && /certif/.test(topic) && /when|date|year/.test(topic)) {
    reply = 'His portfolio lists a Python certificate, but does not provide its date.';
  } else if (pythonMilestone && /python/.test(topic) && /\b(when|since|how long|how many years|what year|which year|date)\b/.test(topic) && !/certif|kwantu|outlier|translated/.test(topic)) {
    reply = 'Letlhogonolo started learning Python in 2022.';
  } else if (/contact|email|hire|freelance|available|reach|phone/.test(topic)) {
    reply = 'Letlhogonolo is available for freelance AI/ML work. Email l.fanampe@gmail.com, connect at linkedin.com/in/djpapzin, or call +27 83 483 7699.';
  } else if (/music|\bdj\b|djing|mix|crew|radio/.test(topic.replace(/\bdj papzin\b/g, '')) && !/project|experience|who/.test(topic)) {
    reply = 'DJ Papzin has been DJing since 2012 and co-founded Papzin & Crew in 2016. The platform features mega-mixes, Cruize Friday mixes, online radio, and custom mix requests. Open the Music section to explore his music.';
  } else if (/\bagent[ -]handoff[ -]kit\b/.test(topic)) {
    reply = 'Agent Handoff Kit is a Python and SQLite recovery prototype. Its demo interrupts one worker and lets another resume from a durable checkpoint, keeping one local receipt and verifying unchanged replay. Its guarantees apply to the local database, not external APIs. Try handoff.djpapzin.com or open its Projects card.';
  } else if (/\bagent[ -]?ops\b/.test(topic)) {
    reply = 'AgentOps Mobile Command Center connects Telegram commands and a FastAPI dashboard to a SQLite run log for supervising agent workflows, model routing and approvals. Demo mode works without provider credentials; live integrations require configuration. Open its Projects card for the recorded demo and repository.';
  } else if (/task tracker/.test(topic)) {
    reply = 'Task Tracker is a task management project built with FastAPI and PostgreSQL. Open Projects for its workflow overview, or contact him to discuss the implementation.';
  } else if (/id recognition/.test(topic)) {
    reply = 'The ID recognition project uses computer vision and OCR to extract information from identity documents. Open Projects for its workflow overview, or contact him to discuss the implementation.';
  } else if (employerContext && /kwantu/.test(topic) && /technolog|stack|tools?|duties|responsibilit|what.*(?:do|did|work|built|use)/.test(topic) && !/when|how long|dates?|duration|years?|months?/.test(topic)) {
    reply = 'At Kwantu, he built RAG chatbots using LangChain and FastAPI, SA ID recognition using Detectron2 and Tesseract, and WhatsApp/Telegram bots.';
  } else if (/\bvisualpro\b/.test(topic)) {
    reply = 'VisualPro won first place at the WebGPU Hackathon. It uses WebGPU and Three.js for 3D data visualisation, with Node.js API endpoints and SQLite storage. Open its project card for the presentation and source code.';
  } else if (/project|built|build|portfolio|code|papzinai|truthguard|vocal thread|visualpro/.test(topic)) {
    reply = 'His projects include Agent Handoff Kit (local worker recovery), AgentOps Mobile Command Center (Telegram agent supervision), ChatSnap-Extractor (screenshot OCR), PapzinAI (multi-agent automation), Task Tracker (FastAPI and PostgreSQL), TruthGuard (fake news detection), Vocal Thread (YouTube comments to audio), VisualPro (WebGPU visualisation), and Papzin & Crew (music streaming). Open Projects for descriptions and links.';
  } else if (/experience|years|career|background|work history|worked|work experience/.test(topic) || employerContext) {
    reply = 'Letlhogonolo started learning Python in 2022. His AI work includes computer vision at Next Sapien from December 2023 to January 2024, RLHF training at Outlier.ai from July 2024 to 2025, AI prompt evaluation at Translated from October 2024 to December 2024, consulting at Kwantu from October 2024 to April 2025, and freelance AI/ML engineering from 2025. Previously, he spent eight years as a lab analyst.';
  } else if (/skill|python|stack|technology|technologies|rag|langchain|nlp/.test(topic)) {
    reply = 'His skills include Python, FastAPI, Django, React, LangChain, TensorFlow, Keras, NLP, OpenCV, OCR, Docker, Git, and Linux. His work covers RAG chatbots, multi-agent systems, and automation.';
  } else if (/education|study|diploma|qualification|certif/.test(topic)) {
    reply = 'He holds a Diploma in Analytical Chemistry from Tshwane University of Technology, with additional certificates in LangChain, Python, and system administration.';
  } else if (/hackathon|win|award/.test(topic)) {
    reply = 'VisualPro won the WebGPU Hackathon. His portfolio also includes participation in other AI hackathons. See Experience and Projects for the details shown on this website.';
  } else {
    reply = 'I can help you explore this portfolio. Ask about experience, skills, projects, music, education, or how to contact Letlhogonolo. I use prepared portfolio information and cannot answer general questions without an AI provider.';
  }
  return { reply, mode: 'portfolio', model: 'portfolio-guide' };
}
module.exports = { portfolioReply };
