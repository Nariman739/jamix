"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  Send,
  Building2,
  AlertCircle,
  Lightbulb,
  Save,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LeadData {
  businessType?: string;
  businessName?: string;
  currentProblems?: string[];
  desiredSolutions?: string[];
  currentTools?: string[];
  employeeCount?: string;
  budgetRange?: string;
  timeline?: string;
  contactName?: string;
  contactPhone?: string;
  contactTelegram?: string;
  summary?: string;
  qualificationScore?: number;
  recommendedServices?: string[];
}

interface SessionData {
  id: string;
  messages: ChatMessage[];
  leadData: LeadData | null;
  contactName: string | null;
  contactPhone: string | null;
  contactTelegram: string | null;
  businessType: string | null;
  status: string;
  qualificationScore: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  visitorId: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Активный" },
  { value: "LEAD_CAPTURED", label: "Лид" },
  { value: "CONTACTED", label: "Связались" },
  { value: "CONVERTED", label: "Клиент" },
  { value: "LOST", label: "Потерян" },
];

export function LeadDetailClient({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setSession(data);
      setNotes(data.notes || "");
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const updateStatus = async (status: string) => {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSession((prev) => prev ? { ...prev, status } : null);
  };

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Загрузка...</div>;
  }

  if (!session) return null;

  const lead = session.leadData as LeadData | null;
  const messages = (session.messages || []) as ChatMessage[];
  // Strip lead_data blocks from messages for display
  const cleanMessages = messages.map((m) => ({
    ...m,
    content: m.content.replace(/```lead_data\s*\n[\s\S]*?\n```/g, "").trim(),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Назад к списку
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: conversation */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h2 className="font-semibold text-sm">Переписка</h2>
              <p className="text-xs text-muted-foreground">{session.messageCount} сообщений</p>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
              {cleanMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-br-sm"
                        : "bg-muted/50 text-foreground/90 rounded-bl-sm"
                    }`}
                  >
                    {msg.content.split("\n").map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: lead info */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Контакт</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-muted-foreground" />
                <span>{session.contactName || lead?.contactName || "—"}</span>
              </div>
              {(session.contactPhone || lead?.contactPhone) && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  <a href={`tel:${session.contactPhone || lead?.contactPhone}`} className="text-brand-blue hover:underline">
                    {session.contactPhone || lead?.contactPhone}
                  </a>
                </div>
              )}
              {(session.contactTelegram || lead?.contactTelegram) && (
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-muted-foreground" />
                  <a
                    href={`https://t.me/${(session.contactTelegram || lead?.contactTelegram || "").replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline"
                  >
                    @{(session.contactTelegram || lead?.contactTelegram || "").replace("@", "")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Business info */}
          {lead && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Бизнес</h3>
              <div className="space-y-3 text-sm">
                {lead.businessType && (
                  <div>
                    <span className="text-xs text-muted-foreground">Тип</span>
                    <p>{lead.businessType}{lead.businessName ? ` — ${lead.businessName}` : ""}</p>
                  </div>
                )}
                {lead.currentProblems?.length ? (
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle size={12} /> Проблемы
                    </span>
                    <ul className="mt-1 space-y-1">
                      {lead.currentProblems.map((p, i) => (
                        <li key={i} className="text-foreground/80">• {p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {lead.recommendedServices?.length ? (
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lightbulb size={12} /> Рекомендации
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {lead.recommendedServices.map((s) => (
                        <span key={s} className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs text-brand-blue">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {lead.summary && (
                  <div>
                    <span className="text-xs text-muted-foreground">Резюме</span>
                    <p className="text-foreground/80">{lead.summary}</p>
                  </div>
                )}
                {lead.qualificationScore && (
                  <div>
                    <span className="text-xs text-muted-foreground">Оценка</span>
                    <p className="font-semibold">{lead.qualificationScore}/10</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Статус</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all ${
                    session.status === opt.value
                      ? "bg-brand-blue text-white"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Заметки</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 resize-none"
              placeholder="Ваши заметки по лиду..."
            />
            <Button
              size="sm"
              className="mt-2 rounded-xl gap-1.5"
              onClick={saveNotes}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? "Сохраняю..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
