const assert = require('node:assert');
const { parseCommand } = require('./commands.js');

assert.equal(parseCommand('pause'), 'pause');
assert.equal(parseCommand('Pause.'), 'pause');
assert.equal(parseCommand('okay fast forward'), 'forward');
assert.equal(parseCommand('rewind'), 'rewind');
assert.equal(parseCommand('please stop'), 'stop');
assert.equal(parseCommand('play'), 'play');
assert.equal(parseCommand('record'), 'record');
assert.equal(parseCommand('resume'), 'resume');
// mid-sentence word must not fire
assert.equal(parseCommand('I had to stop the car yesterday'), null);
assert.equal(parseCommand('hello there'), null);
assert.equal(parseCommand(''), null);
console.log('ok');
