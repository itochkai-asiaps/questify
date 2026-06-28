// Staging Telegram Bot — polling mode, auto-stop after 30 min
// Usage: node /opt/questify-staging/scripts/staging-bot.js

const token = "8788731767:AAGQCuUl5IIuR_nEYHZzGt6A2eqlbAiGSzI";
const api = "https://api.telegram.org/bot" + token;
const local = "http://localhost:3001/api/telegram";
const duration = 30 * 60 * 1000; // 30 minutes

let offset = 0;
const started = Date.now();

console.log("🤖 Staging bot started (auto-stop in 30 min)\n");

const poll = async () => {
  try {
    const r = await fetch(api + "/getUpdates?offset=" + (offset + 1) + "&timeout=10");
    const d = await r.json();
    for (const u of d.result || []) {
      offset = u.update_id;
      if (u.message?.text) {
        console.log("  📩", u.message.text.slice(0, 50));
        await fetch(local, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }).catch(() => {});
      }
    }
  } catch {}
  
  if (Date.now() - started > duration) {
    console.log("\n⏰ 30 minutes elapsed — stopping.");
    process.exit(0);
  }
  setTimeout(poll, 2000);
};

poll();
