import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import type { Lead, Message } from "../types";

const STAGES: Lead["pipeline_stage"][] = ["NEW", "PASS_CLAIMED", "TOUR_BOOKED", "HUMAN_PAUSED"];

export function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setLoading(true);
    const data = await api.get<{ lead: Lead; messages: Message[] }>(`/api/leads/${id}`);
    setLead(data.lead);
    setMessages(data.messages);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleStageChange(stage: Lead["pipeline_stage"]) {
    if (!lead) return;
    setUpdating(true);
    await api.put(`/api/leads/${lead.id}/stage`, { pipeline_stage: stage });
    await load();
    setUpdating(false);
  }

  async function handleResumeBot() {
    if (!lead) return;
    setUpdating(true);
    await api.post(`/api/leads/${lead.id}/resume-bot`);
    await load();
    setUpdating(false);
  }

  if (loading || !lead) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/leads" style={{ color: "#888" }}>← Back to leads</Link>
      <h2>{lead.phone}</h2>

      <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 4 }}>Stage</label>
            <select
              value={lead.pipeline_stage}
              disabled={updating}
              onChange={(e) => handleStageChange(e.target.value as Lead["pipeline_stage"])}
              style={{ padding: 8 }}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        {lead.pipeline_stage === "HUMAN_PAUSED" ? (
          <div>
            <p style={{ color: "#888" }}>Bot has stopped replying (handed off to a human).</p>
            <button onClick={handleResumeBot} disabled={updating} style={{ padding: "8px 16px" }}>
              Resume bot auto-replies
            </button>
          </div>
        ) : (
          <p style={{ color: "#888" }}>Bot is actively replying to this lead.</p>
        )}
      </div>

      <h3>Conversation</h3>
      <div>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 8,
              maxWidth: "75%",
              marginLeft: m.role === "assistant" ? "auto" : 0,
              background: m.role === "assistant" ? "#1b3a2a" : "#222",
            }}
          >
            {m.text}
            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              {new Date(m.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}