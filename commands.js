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
  ['again', 'again'], ['retake', 'again'],
];

// Only short utterances count (<=3 words) and only their tail, so a creator saying
// "...and then I had to stop" mid-sentence won't fire. "okay stop" / "please stop" do.
function parseCommand(text) {
  const words = text.trim().toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return null;
  const tail = words.slice(-2).join(' ');
  for (const [phrase, cmd] of COMMANDS) {
    if (tail === phrase || tail.endsWith(' ' + phrase)) return cmd;
  }
  return null;
}

if (typeof module !== 'undefined') module.exports = { parseCommand };
