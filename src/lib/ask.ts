import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classifyLocal, isTabId, TAB_FOLDER, type ClassifyResult } from "@/spine/classify";
import type { ExchangeChannel, PendingFile } from "@/spine/types";

const TabEnum = z.enum([
  "home",
  "work",
  "growth",
  "travel",
  "health",
  "entertainment",
  "shopping",
  "notes",
  "files",
  "finance",
  "businesses",
]);

const Reply = z.object({
  tab: TabEnum,
  title: z.string(),
  response: z.string(),
  folderName: z.string().optional().default(""),
  sideEffectKind: z.enum(["none", "task", "note", "reminder"]).optional().default("none"),
  sideEffectTitle: z.string().optional().default(""),
});

export type AskInput = {
  query: string;
  channel: ExchangeChannel;
  files?: PendingFile[];
};

export type AskOutput =
  | ({ ok: true } & ClassifyResult)
  | { ok: false; error: string };

function stripFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

const SYSTEM = `You are LivinSync, Rajan Malhotra's personal OS in Delhi.
Classify each ask into exactly one tab and answer concisely (≤120 words), like a quiet chief of staff. No fluff, no markdown headings.
Tabs: home, work, growth, travel, health, entertainment, shopping, notes, files, finance, businesses.
Prefer notes for ambiguous thoughts; files when they only dropped a document; home only for cross-cutting briefings.
If they asked to remember/do something, set sideEffectKind to task, note, or reminder; otherwise none.
Reply with JSON only.`;

export const askSuperhuman = createServerFn({ method: "POST" })
  .validator((input: AskInput) => ({
    query: String(input.query ?? "").slice(0, 4000),
    channel: (input.channel === "voice" || input.channel === "file" ? input.channel : "text") as ExchangeChannel,
    files: (input.files ?? []).slice(0, 4).map((f) => ({
      name: String(f.name ?? "file").slice(0, 180),
      mime: String(f.mime ?? "application/octet-stream").slice(0, 80),
      size: typeof f.size === "number" ? f.size : 0,
      dataUrl: typeof f.dataUrl === "string" && f.dataUrl.length < 220_000 ? f.dataUrl : undefined,
      textExcerpt: typeof f.textExcerpt === "string" ? f.textExcerpt.slice(0, 2000) : undefined,
    })),
  }))
  .handler(async ({ data }): Promise<AskOutput> => {
    const local = classifyLocal(data);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: true, ...local };

    const fileBlock = (data.files ?? [])
      .map((f) => `- ${f.name} (${f.mime}, ${f.size} B)${f.textExcerpt ? `\n  excerpt: ${f.textExcerpt.slice(0, 500)}` : ""}`)
      .join("\n");

    const userText = [
      data.query.trim() ? `Query (${data.channel}): ${data.query.trim()}` : `No text. Channel: ${data.channel}.`,
      fileBlock ? `Attached files:\n${fileBlock}` : "",
      `JSON shape: {"tab":"...","title":"...","response":"...","folderName":"...","sideEffectKind":"none|task|note|reminder","sideEffectTitle":"..."}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const image = (data.files ?? []).find((f) => f.dataUrl?.startsWith("data:image/"));
    const content: unknown = image?.dataUrl
      ? [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: image.dataUrl } },
        ]
      : userText;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content },
          ],
        }),
      });
      if (!res.ok) return { ok: true, ...local };
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = body.choices?.[0]?.message?.content ?? "";
      const parsed = Reply.safeParse(JSON.parse(stripFence(raw)));
      if (!parsed.success) return { ok: true, ...local };
      const r = parsed.data;
      const tab = isTabId(r.tab) ? r.tab : local.tab;
      return {
        ok: true,
        tab,
        title: r.title.slice(0, 80) || local.title,
        response: r.response.slice(0, 1200) || local.response,
        folderName: (r.folderName || TAB_FOLDER[tab]).slice(0, 40),
        sideEffectKind: r.sideEffectKind,
        sideEffectTitle: r.sideEffectTitle.slice(0, 80),
        source: "grok",
      };
    } catch {
      return { ok: true, ...local };
    }
  });
