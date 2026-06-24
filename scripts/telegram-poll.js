/**
 * Telegram Bot — Long Polling Mode
 * 
 * Usage: node scripts/telegram-poll.js
 * 
 * Polls Telegram API every 2 seconds for new messages.
 * When a message arrives, sends it to the local API endpoint
 * which creates an idea via the existing server action.
 */

const BOT_TOKEN = "8864949400:AAFMtqDhqdWQDBoR0Lk0ufu0aqYuHVIAMDY";
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const LOCAL_API = "http://localhost:3000/api/telegram";

let lastUpdateId = 0;

async function getUpdates() {
  try {
    const url = `${API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;

      // Forward to our API endpoint (same format as webhook)
      try {
        await fetch(LOCAL_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
      } catch (err) {
        // API server not running — skip silently
      }
    }
  } catch {
    // Network error — retry on next poll
  }
}

async function poll() {
  console.log("🤖 Questify Telegram Bot started (polling mode)");
  console.log("   Waiting for messages...");
  console.log("");

  while (true) {
    await getUpdates();
    await new Promise((r) => setTimeout(r, 2000));
  }
}

poll();
