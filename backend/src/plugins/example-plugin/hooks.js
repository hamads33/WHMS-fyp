/**
 * example-plugin/hooks.js
 * ------------------------------------------------------------------
 * Minimal hook handlers.
 * Copy and extend when building a new plugin.
 */

async function onUserRegistered({ userId, email }) {
  console.info(`[ExamplePlugin] user.registered — User #${userId} (${email})`);
}

async function onCronDaily(payload) {
  console.info(`[ExamplePlugin] cron.daily — Running daily task`);
}

module.exports = { onUserRegistered, onCronDaily };
