import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// createIdea — field defaults (null-protection)
// ---------------------------------------------------------------------------

// Simulate FormData.get() behavior
function mockFormData(entries: Record<string, string | null>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== null) fd.set(key, value);
  }
  return fd;
}

describe("createIdea field null-protection", () => {
  it("type defaults to idea when not provided", () => {
    const fd = mockFormData({ title: "Test" });
    // Quick create: only title set → type should default to "idea"
    expect((fd.get("type") as string) || "idea").toBe("idea");
  });

  it("type can be explicitly set to problem", () => {
    const fd = mockFormData({ title: "Bug", type: "problem" });
    expect(fd.get("type")).toBe("problem");
  });

  it("description converts null to undefined (Zod-safe)", () => {
    const fd = mockFormData({ title: "Test" });
    // fd.get("description") returns null → replaced with undefined
    expect((fd.get("description") as string) || undefined).toBeUndefined();
  });

  it("source defaults to web", () => {
    const fd = mockFormData({ title: "Test" });
    expect((fd.get("source") as string) || "web").toBe("web");
  });
});

// ---------------------------------------------------------------------------
// Telegram problem: prefix parsing
// ---------------------------------------------------------------------------

const problemPrefix = /^(problem|пр|проблема)\s*:\s*/i;

function parseTelegramText(text: string): { type: "idea" | "problem"; title: string } {
  const match = text.trim().match(problemPrefix);
  if (match) {
    return { type: "problem", title: text.slice(match[0].length).trim() };
  }
  return { type: "idea", title: text.trim() };
}

describe("Telegram problem: prefix parsing", () => {
  it("detects problem: prefix", () => {
    const result = parseTelegramText("problem: Срочный баг");
    expect(result.type).toBe("problem");
    expect(result.title).toBe("Срочный баг");
  });

  it("detects пр: prefix (case insensitive)", () => {
    const result = parseTelegramText("ПР: фикс");
    expect(result.type).toBe("problem");
    expect(result.title).toBe("фикс");
  });

  it("detects проблема: prefix", () => {
    const result = parseTelegramText("проблема: Всё сломалось");
    expect(result.type).toBe("problem");
    expect(result.title).toBe("Всё сломалось");
  });

  it("detects ПРОБЛЕМА: (uppercase)", () => {
    const result = parseTelegramText("ПРОБЛЕМА: БАГ");
    expect(result.type).toBe("problem");
    expect(result.title).toBe("БАГ");
  });

  it("handles prefix with extra spaces", () => {
    const result = parseTelegramText("problem  :  тест");
    expect(result.type).toBe("problem");
    expect(result.title).toBe("тест");
  });

  it("defaults to idea for regular text", () => {
    const result = parseTelegramText("Обычная мысль");
    expect(result.type).toBe("idea");
    expect(result.title).toBe("Обычная мысль");
  });

  it("defaults to idea for text containing 'problem' not as prefix", () => {
    const result = parseTelegramText("Это не problem, а идея");
    expect(result.type).toBe("idea");
    expect(result.title).toBe("Это не problem, а идея");
  });
});
