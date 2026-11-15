import "server-only";

// OpenAI-compatible chat for DRAFTING CURRICULUM ONLY. Callers must only send curriculum text
// (slide text, video captions, exercise text): never student names, codes, answers or ids.
// AI is optional: without AI_API_KEY, aiConfigured() is false and features fall back to manual.

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim() && process.env.AI_BASE_URL?.trim());
}

/** Asks for a JSON object and returns it parsed. Throws a plain-language error on failure. */
export async function chatJSON(system: string, user: string): Promise<unknown> {
  const base = process.env.AI_BASE_URL!.trim().replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY!.trim()}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL?.trim() || "gpt-oss-120b",
      temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(55_000),
  }).catch(() => null);
  if (!res?.ok) throw new Error("The AI service didn't answer. Try again, or build the lesson by hand.");
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("The AI's answer came back garbled. Please try again.");
  }
}
