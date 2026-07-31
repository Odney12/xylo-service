import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import type { Lead } from "../types";

const STAGE_COLORS: Record<Lead["pipeline_stage"], string> = {
  NEW: "#1565c0",
  PASS_CLAIMED: "#f57f17",
  TOUR_BOOKED: "#2e7d32",
  HUMAN_PAUSED: "#757575",
};

export function Leads() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const gymId = searchParams.get("gym_id");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      const path = gymId ? `/api/leads?gym_id=${gymId}` : "/api/leads";
      
      setLoading(true); 
      
      try {
        const data = await api.get<Lead[]>(path);
        setLeads(data);
      } catch (error) {
        console.error("Failed to fetch leads", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [gymId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Leads</h2>
      {leads.length === 0 ? (
        <p style={{ color: "#888" }}>No leads yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
              <th style={{ padding: 8 }}>Phone</th>
              {user?.role === "agency" && !gymId && <th style={{ padding: 8 }}>Gym ID</th>}
              <th style={{ padding: 8 }}>Stage</th>
              <th style={{ padding: 8 }}>Goal</th>
              <th style={{ padding: 8 }}>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: 8 }}>
                  <Link to={`/leads/${lead.id}`}>{lead.phone}</Link>
                </td>
                {user?.role === "agency" && !gymId && <td style={{ padding: 8 }}>{lead.gym_id}</td>}
                <td style={{ padding: 8 }}>
                  <span style={{ color: STAGE_COLORS[lead.pipeline_stage], fontWeight: 600 }}>
                    {lead.pipeline_stage.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: 8 }}>{lead.extracted_goal || "—"}</td>
                <td style={{ padding: 8, color: "#888" }}>{new Date(lead.last_message_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}