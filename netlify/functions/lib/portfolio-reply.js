// Grounded portfolio answers; no AI provider or API key is required.
function portfolioReply(message, history = []) {
  const text = message.toLowerCase();
  const previous = history.filter(turn => turn.role === 'user').map(turn => turn.content.toLowerCase()).join(' ');
  const topic = /^(tell me more|more|what else|and that|can you explain)[?.! ]*$/.test(text.trim()) ? previous : text;
  let reply;
  if (/contact|email|hire|freelance|available|reach|phone/.test(topic)) {
    reply = 'Letlhogonolo is available for freelance AI/ML work. Email l.fanampe@gmail.com, connect at linkedin.com/in/djpapzin, or call +27 83 483 7699.';
  } else if (/music|dj|mix|crew|radio/.test(topic) && !/project|experience|who/.test(topic)) {
    reply = 'DJ Papzin has been DJing since 2012 and co-founded Papzin & Crew in 2016. The platform features mega-mixes, Cruize Friday mixes, online radio, and custom mix requests. Open the Music section to explore his music.';
  } else if (/project|built|build|portfolio|code/.test(topic)) {
    reply = 'His projects include PapzinAI (multi-agent automation), Task Tracker (FastAPI and PostgreSQL), TruthGuard (fake news detection), Vocal Thread (YouTube comments to audio), VisualPro (WebGPU visualisation), and Papzin & Crew (music streaming). Open Projects for descriptions and links.';
  } else if (/experience|years|work|career|background/.test(topic)) {
    reply = 'Letlhogonolo started learning Python in 2022. His AI work includes RLHF training at Outlier.ai in 2024, AI prompt evaluation at Translated in 2024, consulting at Kwantu from October 2024 to April 2025, and freelance AI/ML engineering from 2025. Previously, he spent eight years as a lab analyst.';
  } else if (/skill|python|stack|technology|technologies|rag|langchain|nlp/.test(topic)) {
    reply = 'His skills include Python, FastAPI, Django, React, LangChain, TensorFlow, Keras, NLP, OpenCV, OCR, Docker, Git, and Linux. His work covers RAG chatbots, multi-agent systems, and automation.';
  } else if (/education|study|diploma|qualification|certif/.test(topic)) {
    reply = 'He holds a Diploma in Analytical Chemistry from Tshwane University of Technology, with additional certificates in LangChain, Python, and system administration.';
  } else if (/hackathon|win|award/.test(topic)) {
    reply = 'His portfolio lists three hackathon wins, including a WebGPU Hackathon win for VisualPro. See Experience and Projects for the details shown on this website.';
  } else {
    reply = 'I can help you explore this portfolio. Ask about experience, skills, projects, music, education, or how to contact Letlhogonolo. I use prepared portfolio information and cannot answer general questions without an AI provider.';
  }
  return { reply, mode: 'portfolio', model: 'portfolio-guide' };
}
module.exports = { portfolioReply };
