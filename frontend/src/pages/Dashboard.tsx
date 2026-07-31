import React, { useState, useMemo, useEffect } from 'react';
import type { Gym, Lead, Message, PipelineStage } from '../types';
import { useAuth } from '../AuthContext';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';

const Icons = {
  Phone: () => (
    <svg className="w-4 h-4 inline-block mr-1 text-[#8A8A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  MessageSquare: () => (
    <svg className="w-4 h-4 inline-block mr-1 text-[#C9A96A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4 inline-block text-[#C9A96A] mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  UserPause: () => (
    <svg className="w-4 h-4 inline-block text-[#C9A96A] mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-4 h-4 inline-block text-[#C9A96A] mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Send: () => (
    <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
};

const STAGES: { id: PipelineStage; label: string; badgeBg: string; borderColor: string; description: string }[] = [
  { id: "NEW", label: "New Leads", badgeBg: "bg-[#C9A96A]/10 text-[#C9A96A] border-[#C9A96A]/30", borderColor: "border-t-[#C9A96A]", description: "Inbound WhatsApp inquiries waiting for..." },
  { id: "PASS_CLAIMED", label: "Pass Claimed", badgeBg: "bg-[#C9A96A]/20 text-[#E5C383] border-[#C9A96A]/40", borderColor: "border-t-[#E5C383]", description: "Leads who unlocked their 3-Day Free Trial..." },
  { id: "TOUR_BOOKED", label: "Tour Booked", badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", borderColor: "border-t-emerald-500", description: "Prospects scheduled for in-person gym visit" },
  { id: "HUMAN_PAUSED", label: "Human Takeover", badgeBg: "bg-[#C9A96A]/20 text-[#E5C383] border-[#C9A96A]/40", borderColor: "border-t-[#C9A96A]", description: "AI auto-reply disabled for manual front-desk..." }
];

export function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Agency users pick a gym via ?gym_id=; gym owners always see their own.
  const gymId = user?.role === "agency" ? Number(searchParams.get("gym_id")) : user?.gym_id;

  const [gym, setGym] = useState<Gym | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterStage, setActiveFilterStage] = useState<string>("ALL");
  const [newMsgText, setNewMsgText] = useState("");
  const [isSimulatingIncoming, setIsSimulatingIncoming] = useState(false);
  const [loading, setLoading] = useState(true);

  const [simPhone, setSimPhone] = useState(() => "+91 98" + Math.floor(10000000 + Math.random() * 89999999));
  const [simText, setSimText] = useState("Hey! What are the monthly membership fees at this gym?");
  const [simSubmitting, setSimSubmitting] = useState(false);

  async function loadGymAndLeads() {
    if (!gymId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [gymData, leadsData] = await Promise.all([
      api.get<Gym>(`/api/gyms/${gymId}`),
      api.get<Lead[]>(`/api/leads?gym_id=${gymId}`),
    ]);
    setGym(gymData);
    setLeads(leadsData);
    setLoading(false);
  }

  useEffect(() => {
    loadGymAndLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  async function loadMessagesForLead(leadId: number) {
    const data = await api.get<{ lead: Lead; messages: Message[] }>(`/api/leads/${leadId}`);
    setMessages((prev) => ({ ...prev, [leadId]: data.messages }));
  }

  function openChat(leadId: number) {
    setSelectedLeadId(leadId);
    loadMessagesForLead(leadId);
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.extracted_goal && lead.extracted_goal.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = activeFilterStage === "ALL" || lead.pipeline_stage === activeFilterStage;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchQuery, activeFilterStage]);

  const activeLead = useMemo(() => leads.find((l) => l.id === selectedLeadId) || null, [leads, selectedLeadId]);

  async function handleMoveStage(leadId: number, targetStage: PipelineStage) {
    if (targetStage === "HUMAN_PAUSED") {
      await api.put(`/api/leads/${leadId}/stage`, { pipeline_stage: "HUMAN_PAUSED" });
    } else {
      await api.put(`/api/leads/${leadId}/stage`, { pipeline_stage: targetStage });
    }
    await loadGymAndLeads();
  }

  async function handleToggleHumanPause(leadId: number) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.pipeline_stage === "HUMAN_PAUSED") {
      await api.post(`/api/leads/${leadId}/resume-bot`);
    } else {
      await api.put(`/api/leads/${leadId}/stage`, { pipeline_stage: "HUMAN_PAUSED" });
    }
    await loadGymAndLeads();
  }

  async function handleSendManualMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadId || !newMsgText.trim()) return;
    await api.post(`/api/leads/${selectedLeadId}/send`, { text: newMsgText.trim() });
    setNewMsgText("");
    await loadMessagesForLead(selectedLeadId);
    await loadGymAndLeads();
  }

  async function handleSimulateWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!simText.trim() || !gymId || simSubmitting) return;
    setSimSubmitting(true);
    await api.post("/api/dev/simulate-webhook", {
      gym_id: gymId,
      phone: simPhone,
      name: "Test Prospect",
      text: simText,
    });
    setIsSimulatingIncoming(false);
    setSimText("");
    setSimPhone("+91 98" + Math.floor(10000000 + Math.random() * 89999999));
    await loadGymAndLeads();
    setSimSubmitting(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!gymId || !gym) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
        No gym selected. {user?.role === "agency" ? "Pick a gym from the Gyms page first." : "No gym assigned to your account."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF] font-sans antialiased flex flex-col">
      <header className="border-b border-[#2A2A2A] bg-[#1A1A1A]/90 backdrop-blur sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#C9A96A] to-[#E5C383] flex items-center justify-center font-bold text-[#0B0B0B] shadow-lg shadow-[#C9A96A]/20">AI</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">{gym.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#C9A96A]/10 text-[#C9A96A] border border-[#C9A96A]/30 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96A] animate-pulse"></span>
                WhatsApp Bot Active
              </span>
            </div>
            <p className="text-xs text-[#8A8A8A]">Phone Number ID: {gym.phone_number_id} • Cloudflare D1 Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSimulatingIncoming(true)} className="px-4 py-2 text-xs font-bold rounded-lg bg-[#C9A96A] text-[#000000] hover:bg-[#B89858] transition flex items-center shadow-lg shadow-[#C9A96A]/10 cursor-pointer uppercase">
            {Icons.Plus()} Test Inbound WhatsApp
          </button>
          <div className="h-8 w-px bg-[#2A2A2A] hidden md:block" />
          <div className="text-right hidden md:block">
            <p className="text-xs text-[#8A8A8A]">Model Engine</p>
            <p className="text-xs font-semibold text-[#C9A96A]">Gemini 3.5 Flash</p>
          </div>
        </div>
      </header>

      <div className="p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md">
          <p className="text-xs font-medium text-[#8A8A8A]">Total WhatsApp Leads</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-white">{leads.length}</p>
            <span className="text-xs text-[#C9A96A] font-medium">100% automated</span>
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md">
          <p className="text-xs font-medium text-[#8A8A8A]">Passes Unlocked</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-[#C9A96A]">{leads.filter((l) => l.pipeline_stage === "PASS_CLAIMED" || l.pipeline_stage === "TOUR_BOOKED").length}</p>
            <span className="text-xs text-[#8A8A8A]">Free trials</span>
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md">
          <p className="text-xs font-medium text-[#8A8A8A]">Gym Tours Scheduled</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-400">{leads.filter((l) => l.pipeline_stage === "TOUR_BOOKED").length}</p>
            <span className="text-xs text-emerald-400 font-medium">{Math.round((leads.filter((l) => l.pipeline_stage === "TOUR_BOOKED").length / (leads.length || 1)) * 100)}% conv.</span>
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md">
          <p className="text-xs font-medium text-[#8A8A8A]">Human Interventions</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-[#E5C383]">{leads.filter((l) => l.pipeline_stage === "HUMAN_PAUSED").length}</p>
            <span className="text-xs text-[#8A8A8A] font-medium">Needs desk call</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input type="text" placeholder="Search phone number, lead name, or extracted fitness goal..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#C9A96A]" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button onClick={() => setActiveFilterStage("ALL")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${activeFilterStage === "ALL" ? "bg-[#C9A96A] text-[#0B0B0B] font-bold" : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#8A8A8A] hover:text-white"}`}>
            All Stages ({leads.length})
          </button>
          {STAGES.map((s) => (
            <button key={s.id} onClick={() => setActiveFilterStage(s.id)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap ${activeFilterStage === s.id ? "bg-[#2A2A2A] border-[#C9A96A] text-[#C9A96A] font-semibold" : "bg-[#1A1A1A] border-[#2A2A2A] text-[#8A8A8A] hover:text-white"}`}>
              {s.label} ({leads.filter((l) => l.pipeline_stage === s.id).length})
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[1000px] h-full items-start">
          {STAGES.map((stage) => {
            const columnLeads = filteredLeads.filter((l) => l.pipeline_stage === stage.id);
            return (
              <div key={stage.id} className={`bg-[#1A1A1A]/70 border border-[#2A2A2A] rounded-xl flex flex-col max-h-[calc(100vh-280px)] border-t-4 ${stage.borderColor}`}>
                <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-sm text-white">{stage.label}</h2>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${stage.badgeBg}`}>{columnLeads.length}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5 line-clamp-1">{stage.description}</p>
                  </div>
                </div>
                <div className="p-3 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                  {columnLeads.map((lead) => {
                    const leadMsgs = messages[lead.id] || [];
                    const lastMsg = leadMsgs[leadMsgs.length - 1];
                    return (
                      <div key={lead.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#C9A96A]/60 rounded-xl p-4 transition shadow-md hover:shadow-lg flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm text-white">{lead.name || "Unknown"}</h3>
                              <p className="text-xs text-[#8A8A8A] font-mono mt-0.5 flex items-center">{Icons.Phone()}{lead.phone}</p>
                            </div>
                            <span className="text-[10px] text-[#8A8A8A] whitespace-nowrap">{new Date(lead.last_message_at).toLocaleString()}</span>
                          </div>
                          {lead.extracted_goal && (
                            <div className="mt-3 p-2 rounded-lg bg-[#C9A96A]/10 border border-[#C9A96A]/30 flex items-start gap-1.5">
                              {Icons.Sparkles()}<p className="text-[11px] text-[#C9A96A] font-medium leading-tight">{lead.extracted_goal}</p>
                            </div>
                          )}
                          {lastMsg && (
                            <div className="mt-2 text-xs text-[#8A8A8A] line-clamp-2 bg-[#0B0B0B]/60 p-2 rounded border border-[#2A2A2A]">
                              <span className="font-semibold text-white">{lastMsg.role === "user" ? "Lead: " : "AI: "}</span>{lastMsg.text}
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-[#2A2A2A] flex items-center justify-between">
                          <button onClick={() => openChat(lead.id)} className="text-xs font-medium text-[#C9A96A] hover:text-[#E5C383] flex items-center transition">
                            {Icons.MessageSquare()} Open Chat ({leadMsgs.length})
                          </button>
                          <button title={lead.pipeline_stage === "HUMAN_PAUSED" ? "Resume AI Engine" : "Pause AI for Human"} onClick={() => handleToggleHumanPause(lead.id)} className={`p-1.5 rounded-lg border text-xs transition ${lead.pipeline_stage === "HUMAN_PAUSED" ? "bg-[#C9A96A]/20 text-[#E5C383] border-[#C9A96A]/40 hover:bg-[#C9A96A]/30" : "bg-[#2A2A2A] text-[#8A8A8A] border-[#333333] hover:text-white"}`}>
                            {Icons.UserPause()}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {activeLead && (
        <div className="fixed inset-0 bg-[#0B0B0B]/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-[#1A1A1A] border-l border-[#2A2A2A] h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#2A2A2A] border border-[#C9A96A]/40 flex items-center justify-center font-bold text-[#C9A96A]">{activeLead.name ? activeLead.name.charAt(0) : "L"}</div>
                <div>
                  <h2 className="font-bold text-white text-base">{activeLead.name || "WhatsApp Lead"}</h2>
                  <p className="text-xs text-[#8A8A8A] font-mono">{activeLead.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLeadId(null)} className="p-2 text-[#8A8A8A] hover:text-white rounded-lg hover:bg-[#2A2A2A] text-sm font-semibold">✕ Close</button>
            </div>
            <div className="p-4 bg-[#0B0B0B]/80 border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#8A8A8A] uppercase font-semibold">Move Pipeline Column</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {STAGES.map((s) => (
                    <button key={s.id} onClick={() => handleMoveStage(activeLead.id, s.id)} className={`px-2 py-1 text-[10px] font-semibold rounded border transition ${activeLead.pipeline_stage === s.id ? "bg-[#C9A96A] text-[#0B0B0B] border-[#C9A96A]" : "bg-[#1A1A1A] text-[#8A8A8A] border-[#2A2A2A] hover:text-white"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => handleToggleHumanPause(activeLead.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center ${activeLead.pipeline_stage === "HUMAN_PAUSED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[#C9A96A]/10 text-[#C9A96A] border-[#C9A96A]/30"}`}>
                {activeLead.pipeline_stage === "HUMAN_PAUSED" ? `${Icons.CheckCircle()} Resume AI Bot` : `${Icons.UserPause()} Pause AI`}
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B0B0B]">
              {(messages[activeLead.id] || []).map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === "assistant" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${msg.role === "assistant" ? "bg-[#C9A96A] text-[#0B0B0B] font-medium rounded-br-none" : "bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-bl-none"}`}>
                    <div className="text-[10px] opacity-75 font-bold mb-0.5">{msg.role === "assistant" ? `${gym.name} AI Bot` : activeLead.phone}</div>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#8A8A8A] mt-1 px-1">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendManualMessage} className="p-4 border-t border-[#2A2A2A] bg-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Type a manual message..." value={newMsgText} onChange={(e) => setNewMsgText(e.target.value)} className="flex-1 bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#C9A96A]" />
                <button type="submit" disabled={!newMsgText.trim()} className="px-4 py-2.5 rounded-lg bg-[#C9A96A] text-[#0B0B0B] font-bold text-xs disabled:opacity-50 hover:bg-[#B89858] transition uppercase">{Icons.Send()}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSimulatingIncoming && (
        <div className="fixed inset-0 bg-[#0B0B0B]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">{Icons.Sparkles()} Simulate Inbound Webhook</h3>
            <p className="text-[11px] text-[#8A8A8A] mt-1">This runs the real Gemini + database pipeline - no fake data, just skips Meta itself.</p>
            <form onSubmit={handleSimulateWebhook} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8A8A8A] mb-1">Incoming Message</label>
                <textarea value={simText} onChange={(e) => setSimText(e.target.value)} rows={3} className="w-full bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C9A96A]" required />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsSimulatingIncoming(false)} className="px-4 py-2 text-xs font-semibold text-[#8A8A8A] hover:text-white">Cancel</button>
                <button type="submit" disabled={simSubmitting} className="px-4 py-2 rounded-lg bg-[#C9A96A] text-[#0B0B0B] font-bold text-xs hover:bg-[#B89858] transition uppercase disabled:opacity-50">{simSubmitting ? "Firing..." : "Fire Webhook"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}