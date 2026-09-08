const assert = require('node:assert');
const { parseCommand } = require('./commands.js');

// commands
assert.equal(parseCommand('pause'), 'pause');
assert.equal(parseCommand('Pause.'), 'pause');
assert.equal(parseCommand('okay fast forward'), 'forward');
assert.equal(parseCommand('rewind'), 'rewind');
assert.equal(parseCommand('please stop'), 'stop');
assert.equal(parseCommand('cut!'), 'stop');
assert.equal(parseCommand('play'), 'play');
assert.equal(parseCommand('record'), 'record');
assert.equal(parseCommand('resume'), 'resume');
assert.equal(parseCommand('again'), 'again');
assert.equal(parseCommand('do it again'), 'again');
// must NOT fire: mid-sentence, substrings, long utterances
assert.equal(parseCommand('I had to stop the car yesterday'), null);
assert.equal(parseCommand('I need to stop'), null);
assert.equal(parseCommand('stopwatch'), null);
assert.equal(parseCommand('play it again please ok'), null);
assert.equal(parseCommand('hold on'), null);
assert.equal(parseCommand('hello there'), null);
assert.equal(parseCommand(''), null);
assert.equal(parseCommand('   '), null);
console.log('ok');
