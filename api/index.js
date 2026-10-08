// Vercel entry point. Everything else is identical to `node server.js`.
// Note: Vercel functions have no persistent disk, so the index lives in /tmp and resets on cold starts.
// Use the Dockerfile on a host with a volume for a real instance.
const { handler } = require('../server.js');
module.exports = handler;
