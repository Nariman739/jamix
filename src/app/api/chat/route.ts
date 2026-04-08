import { prisma } from "@/lib/prisma";
import { getOpenRouter, AI_MODEL } from "@/lib/openrouter";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { extractLeadData, stripLeadBlock, hasPartialLeadBlock } from "@/lib/lead-extractor";
import { notifyNewLead } from "@/lib/telegram";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 60;

// Simple rate limiting (in-memory, resets on cold start)
const rateLimits = new Map<string, { sessions: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { sessions: 1, resetAt: now + 86400000 }); // 24h
    return true;
  }

  if (limit.sessions >= 10) return false;
  limit.sessions++;
  return true;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { message, visitorId, sessionId: inputSessionId } = body as {
      message: string;
      visitorId: string;
      sessionId?: string;
    };

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Сообщение обязательно" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get or create chat session
    let sessionId = inputSessionId;
    let chatSession;

    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, status: { not: "LOST" } },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          visitorId: visitorId || "anonymous",
          userAgent: request.headers.get("user-agent") || undefined,
          referrer: request.headers.get("referer") || undefined,
          utmSource: new URL(request.url).searchParams.get("utm_source") || undefined,
          ipCity: request.headers.get("x-vercel-ip-city") || undefined,
        },
      });
      sessionId = chatSession.id;
    }

    // Check message limit per session
    if (chatSession.messageCount >= 40) {
      return new Response(
        JSON.stringify({ error: "Лимит сообщений. Нариман скоро свяжется с вами!" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingMessages = (chatSession.messages ?? []) as unknown as ChatMessage[];

    // Build OpenAI messages
    const systemPrompt = buildSystemPrompt();
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of existingMessages) {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
    openaiMessages.push({ role: "user", content: message.trim() });

    // Stream response
    let fullContent = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId })}\n\n`)
          );

          // Stream AI response
          const stream = await getOpenRouter().chat.completions.create({
            model: AI_MODEL,
            messages: openaiMessages,
            stream: true,
            max_tokens: 500,
            temperature: 0.7,
          });

          // Buffer approach: stream text until we detect lead_data block starting
          let inLeadBlock = false;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;

              // If we're inside a lead_data block, don't send to client
              if (inLeadBlock) continue;

              // Check if lead_data block is starting
              if (hasPartialLeadBlock(fullContent)) {
                inLeadBlock = true;
                continue;
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: delta })}\n\n`)
              );
            }
          }

          const cleanContent = stripLeadBlock(fullContent);

          // If lead block was detected, send corrected content
          if (inLeadBlock) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "replace", content: cleanContent })}\n\n`)
            );
          }

          // Extract and save lead data
          const leadData = extractLeadData(fullContent);

          const updatedMessages: ChatMessage[] = [
            ...existingMessages,
            { role: "user", content: message.trim() },
            { role: "assistant", content: cleanContent },
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: Record<string, any> = {
            messages: JSON.parse(JSON.stringify(updatedMessages)),
            messageCount: chatSession!.messageCount + 2,
          };

          if (leadData) {
            updateData.leadData = JSON.parse(JSON.stringify(leadData));
            if (leadData.contactName) updateData.contactName = leadData.contactName;
            if (leadData.contactPhone) updateData.contactPhone = leadData.contactPhone;
            if (leadData.contactTelegram) updateData.contactTelegram = leadData.contactTelegram;
            if (leadData.businessType) updateData.businessType = leadData.businessType;
            if (leadData.qualificationScore) updateData.qualificationScore = leadData.qualificationScore;

            // If contact was provided, mark as lead captured
            if (leadData.contactPhone || leadData.contactTelegram) {
              updateData.status = "LEAD_CAPTURED";

              // Notify Nariman via Telegram
              notifyNewLead(sessionId!, leadData).catch(console.error);
            }
          }

          await prisma.chatSession.update({
            where: { id: sessionId },
            data: updateData,
          });

          // Send done
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Ошибка AI" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", errMsg);
    return new Response(
      JSON.stringify({ error: "Ошибка чата" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
