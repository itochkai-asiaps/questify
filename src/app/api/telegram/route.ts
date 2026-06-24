import { NextRequest, NextResponse } from "next/server";
import {
  createIdeaFromTelegram,
  getUserIdByTelegramChatId,
  linkTelegramChat,
} from "@/lib/actions/ideas";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text as string;

    // Commands
    if (text === "/start") {
      await sendMessage(
        chatId,
        "<b>Questify Ideas Bot</b> 🚀\n\n" +
        "Send me any text and I'll save it as an idea.\n\n" +
        "<b>Link your account:</b>\n" +
        "1. Open Questify → Profile\n" +
        "2. Copy your User ID\n" +
        "3. Send <code>/link YOUR_USER_ID</code> here\n\n" +
        "First line = idea title\n" +
        "Next lines = description (optional)",
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/link ")) {
      const userId = text.slice(6).trim();
      if (!userId || userId.length < 10) {
        await sendMessage(chatId, "❌ Invalid User ID. Copy it from Questify → Profile.");
        return NextResponse.json({ ok: true });
      }
      const result = await linkTelegramChat(userId, chatId);
      if (result.error) {
        await sendMessage(chatId, "❌ Failed to link: " + result.error);
      } else {
        await sendMessage(chatId, "✅ Account linked! Send me your ideas now.");
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/")) {
      return NextResponse.json({ ok: true });
    }

    // Find user by Telegram chat ID
    const userId = await getUserIdByTelegramChatId(chatId);

    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Your Telegram is not linked yet.\n\n" +
        "1. Open Questify → Profile → copy your User ID\n" +
        "2. Send <code>/link YOUR_USER_ID</code>",
      );
      return NextResponse.json({ ok: true });
    }

    // Create idea
    const result = await createIdeaFromTelegram(userId, text);

    if (result.error) {
      await sendMessage(chatId, "❌ Failed to save idea. Try again.");
    } else {
      await sendMessage(chatId, "💡 Idea saved!");
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
