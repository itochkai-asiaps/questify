import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Admin client — lazy init so build doesn't fail without the env var
let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _admin = createClient<any>(
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
    // Detect type from prefix: problem:/пр:/проблема: (case-insensitive)
    const problemPrefix = /^(problem|пр|проблема)\s*:\s*/i;
    let type = "idea";
    let title = text.trim();

    const prefixMatch = title.match(problemPrefix);
    if (prefixMatch) {
      type = "problem";
      title = title.slice(prefixMatch[0].length).trim();
    }

    const lines = title.split("\n");
    const titleLine = lines[0].slice(0, 500);
    const desc = lines.slice(1).join("\n").slice(0, 5000) || null;

    const { error } = await getAdmin().from("ideas").insert({
      user_id: link.user_id,
      title: titleLine,
      description: desc,
      source: "telegram",
      type,
    });

    if (error) {
      await sendMessage(chatId, "❌ Failed: " + error.message);
    } else {
      await sendMessage(chatId, type === "problem" ? "⚠️ Problem saved!" : "💡 Idea saved!");
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
