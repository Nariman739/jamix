"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  MessageSquare,
  Users,
  TrendingUp,
  Search,
  ExternalLink,
} from "lucide-react";

interface LeadSession {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  contactTelegram: string | null;
  businessType: string | null;
  status: string;
  qualificationScore: number | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  leadData: Record<string, unknown> | null;
}

interface Stats {
  totalToday: number;
  totalWeek: number;
  totalLeads: number;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активный",
  LEAD_CAPTURED: "Лид",
  CONTACTED: "Связались",
  CONVERTED: "Клиент",
  LOST: "Потерян",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-500/20 text-blue-400",
  LEAD_CAPTURED: "bg-green-500/20 text-green-400",
  CONTACTED: "bg-yellow-500/20 text-yellow-400",
  CONVERTED: "bg-purple-500/20 text-purple-400",
  LOST: "bg-red-500/20 text-red-400",
};

export function DashboardClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LeadSession[]>([]);
  const [stats, setStats] = useState<Stats>({ totalToday: 0, totalWeek: 0, totalLeads: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/leads?${params}`);
      if (res.status === 401) {
        router.push("/dashboard/login");
        return;
      }
      const data = await res.json();
      setSessions(data.sessions || []);
      setStats(data.stats || { totalToday: 0, totalWeek: 0, totalLeads: 0 });
    } catch (e) {
      console.error("Failed to fetch leads:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, router]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">JamiX Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Лиды и разговоры</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleLogout}>
          <LogOut size={14} />
          Выйти
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-brand-blue" />
            <div>
              <p className="text-2xl font-bold">{stats.totalToday}</p>
              <p className="text-xs text-muted-foreground">Диалогов сегодня</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-brand-purple" />
            <div>
              <p className="text-2xl font-bold">{stats.totalWeek}</p>
              <p className="text-xs text-muted-foreground">За неделю</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats.totalLeads}</p>
              <p className="text-xs text-muted-foreground">Лидов всего</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, бизнесу, телефону..."
            className="w-full rounded-xl bg-muted/50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "ACTIVE", "LEAD_CAPTURED", "CONTACTED", "CONVERTED", "LOST"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                statusFilter === s
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Все" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Lead list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Пока нет диалогов. Лиды появятся когда посетители начнут общаться с AI-консультантом.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => router.push(`/dashboard/leads/${session.id}`)}
              className="w-full text-left glass rounded-xl p-4 glow-hover flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {session.contactName || "Без имени"}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[session.status]}`}>
                    {STATUS_LABELS[session.status]}
                  </span>
                  {session.qualificationScore && (
                    <span className="text-xs text-muted-foreground">
                      {session.qualificationScore}/10
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {session.businessType && <span>{session.businessType}</span>}
                  {session.contactPhone && <span>{session.contactPhone}</span>}
                  {session.contactTelegram && <span>@{session.contactTelegram}</span>}
                  <span>{session.messageCount} сообщ.</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {new Date(session.updatedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <ExternalLink size={14} className="text-muted-foreground/50 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
