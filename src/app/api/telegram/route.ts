import { NextRequest, NextResponse } from "next/server";
import { createIdeaFromTelegram, getUserIdByTelegramChatId } from "@/lib/actions/ideas";

/**
 * POST /api/telegram — Telegram Bot webhook
 * 
 * Receives messages from Telegram users and creates ideas.
 * 
 * Setup:
 * 1. Create bot via @BotFather → get BOT_TOKEN
 * 2. Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram
 * 3. User links their Telegram: /link command in bot → calls linkTelegramChat
 * 4. Any text message → creates an idea
 * 
 * Security: verify X-Telegram-Bot-Api-Secret-Token header (set in webhook config)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // Only handle text messages
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text as string;

    // Skip bot commands
    if (text.startsWith("/")) {
      return NextResponse.json({ ok: true });
    }

    // Find user by Telegram chat ID
    const userId = await getUserIdByTelegramChatId(chatId);

    if (!userId) {
      // User not linked — send instructions
      // For MVP: store the message anyway in a pending queue? No — require linking.
      return NextResponse.json({ ok: true });
    }

    // Create idea
    const result = await createIdeaFromTelegram(userId, text);

    if (result.error) {
      console.error("Failed to create idea from Telegram:", result.error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

/**
 * GET /api/telegram — health check / webhook verification
 */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "Questify Telegram Bot" });
}
