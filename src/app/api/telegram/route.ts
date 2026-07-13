import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createIdeaFromTelegram } from "@/lib/actions/ideas";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Admin client — lazy init so build doesn't fail without the env var
let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || "missing",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _admin;
}

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

    // ── /start ──
    if (text === "/start") {
      await sendMessage(
        chatId,
        "<b>Questify Ideas Bot</b> 🚀\n\n" +
          "Send me an idea and I'll save it.\n\n" +
          "<b>Link your account:</b>\n" +
          "1. Open Questify → Profile → copy User ID\n" +
          "2. Send <code>/link YOUR_USER_ID</code>\n\n" +
          "First line = title\nNext lines = description",
      );
      return NextResponse.json({ ok: true });
    }

    // ── /link <user_id> ──
    if (text.startsWith("/link ")) {
      const userId = text.slice(6).trim();
      if (!userId || userId.length < 10) {
        await sendMessage(chatId, "❌ Invalid User ID.");
        return NextResponse.json({ ok: true });
      }
      const { error } = await getAdmin()
        .from("telegram_chats")
        .upsert({ user_id: userId, chat_id: chatId });

      if (error) {
        await sendMessage(chatId, "❌ Failed: " + error.message);
      } else {
        await sendMessage(chatId, "✅ Linked! Send me your ideas.");
      }
      return NextResponse.json({ ok: true });
    }

    // ── Unknown commands ──
    if (text.startsWith("/")) {
      return NextResponse.json({ ok: true });
    }

    // ── Find linked user ──
    const { data: link } = await getAdmin()
      .from("telegram_chats")
      .select("user_id")
      .eq("chat_id", chatId)
      .single();

    if (!link) {
      await sendMessage(
        chatId,
        "⚠️ Not linked yet.\nCopy your User ID from Profile → send <code>/link YOUR_ID</code>",
      );
      return NextResponse.json({ ok: true });
    }

    // ── Save idea ──
    const result = await createIdeaFromTelegram(link.user_id, text);

    if (result.error) {
      await sendMessage(chatId, "❌ Failed: " + result.error);
    } else {
      // Detect type for reply message
      const problemPrefix = /^(problem|пр|проблема)\s*:\s*/i;
      const isProblem = problemPrefix.test(text.trim());
      await sendMessage(chatId, isProblem ? "⚠️ Problem saved!" : "💡 Idea saved!");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
