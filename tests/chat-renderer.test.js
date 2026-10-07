const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sourceUrl } = require('../assets/chat-renderer');
const revision = 'a'.repeat(40);
test('source links use the indexed commit and encode filename characters', () => {
  assert.equal(sourceUrl({repo:'Vocal-Thread',revision,path:'src/audio notes#1.py'}), `https://github.com/djpapzin/Vocal-Thread/blob/${revision}/src/audio%20notes%231.py`);
});
test('old indexes link to the repository without guessing its branch', () => {
  assert.equal(sourceUrl({repo:'Vocal-Thread',path:'app.py'}),'https://github.com/djpapzin/Vocal-Thread');
});
test('source links reject traversal and untrusted repository URLs', () => {
  for (const path of ['../secret','src/../secret','/app.py','src\\app.py','src/\napp.py']) assert.equal(sourceUrl({repo:'Vocal-Thread',revision,path}),null);
  for (const repo of ['..','https://evil.test','x/../y','x" onclick="bad']) assert.equal(sourceUrl({repo,revision,path:'app.py'}),null);
});
