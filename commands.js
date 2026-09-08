// Pure command parser. Shared by index.html and test_commands.js.
// Returns one of: record pause resume stop play rewind forward, or null.
const COMMANDS = [
  ['fast forward', 'forward'], ['forward', 'forward'], ['skip', 'forward'],
  ['rewind', 'rewind'], ['go back', 'rewind'],
  ['record', 'record'], ['start', 'record'], ['action', 'record'],
  ['resume', 'resume'], ['continue', 'resume'],
  ['pause', 'pause'], ['hold', 'pause'],
  ['stop', 'stop'], ['cut', 'stop'],
  ['play', 'play'],
];

// Only the tail of the transcript counts, so a creator saying
// "...and then I had to stop" mid-sentence won't fire unless "stop" is the last word.
function parseCommand(text) {
  const tail = text.trim().toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).slice(-2).join(' ');
  for (const [phrase, cmd] of COMMANDS) {
    if (tail === phrase || tail.endsWith(' ' + phrase)) return cmd;
  }
  return null;
}

if (typeof module !== 'undefined') module.exports = { parseCommand };
