import type { Contact, CrmStage, LeadCategory } from "@/types/domain";

export type EditableMetricRecord = { id: string; label: string; value: string; detail: string; group?: string };
type LeadPatch = { owner?: string; category?: LeadCategory | ""; stage?: CrmStage; heat?: number; notes?: string; lostAt?: string };

function statusFor(stage: CrmStage): Contact["status"] {
  if (stage === "Por contactar") return "Nuevo";
  if (stage === "Propuesta enviada") return "Propuesta";
  if (stage === "Llamada programada" || stage === "Llamada tenida") return "Reunión";
  if (stage === "Cliente") return "Cliente";
  return "Contactado";
}

function sourceFor(row: Record<string, any>): string {
  const source = String(row.source_payload?.source || "").trim().toLowerCase();
  if (source === "website") return "Página web";
  if (source === "meta") return "Meta Ads";
  if (row.campaign_notion_urls?.length) return "Meta Ads";
  return "Sin origen";
}

function toContact(row: Record<string, any>): Contact {
  const name = row.name || "Sin nombre";
  const stage = (row.crm_stage || "Por contactar") as CrmStage;
  const category = row.lead_type === "Delft" ? "delft" : row.lead_type;
  return { id: row.id, name, initials: name.split(/\s+/).slice(0, 2).map((part: string) => part[0] || "").join("").toUpperCase(), email: row.email || "", phone: row.phone || "", country: "", university: row.school_name || "", course: "", product: "Aplicación", status: statusFor(stage), source: sourceFor(row), campaign: row.source_payload?.campaign_name || row.source_payload?.form_name || "—", owner: row.owner_names?.[0] || "", probability: Number(row.heat || 0), nextAction: "", lastContact: row.contact_at || "—", value: 0, tags: [], category: category as LeadCategory | undefined, heat: Number(row.heat ?? 50), notes: row.comment || "", stage, lostAt: row.lost_at || undefined, createdAt: row.created_at || undefined };
}

export const adminDataClient = {
  async listLeads(): Promise<Contact[]> {
    const response = await fetch("/api/admin/crm/leads", { credentials: "include" });
    if (!response.ok) throw new Error(response.status === 503 ? "Falta configurar la base de datos del CRM" : "No se pudieron cargar los leads");
    const payload = await response.json();
    return (payload.leads || []).map(toContact);
  },
  async updateLead(id: string, patch: LeadPatch) {
    const update: Record<string, unknown> = {};
    if (patch.owner !== undefined) update.owner_names = patch.owner ? [patch.owner] : [];
    if (patch.category !== undefined) update.lead_type = patch.category === "delft" ? "Delft" : patch.category || null;
    if (patch.stage !== undefined) update.crm_stage = patch.stage;
    if (patch.heat !== undefined) update.heat = patch.heat;
    if (patch.notes !== undefined) update.comment = patch.notes;
    if (patch.lostAt !== undefined) update.lost_at = patch.lostAt || null;
    const response = await fetch("/api/admin/crm/leads", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, patch: update }) });
    if (!response.ok) throw new Error("No se pudo actualizar el lead");
    return { ok: true };
  },
  subscribe(onChange: () => void) {
    const timer = window.setInterval(onChange, 30_000);
    return () => window.clearInterval(timer);
  },
  listMetrics: async (): Promise<EditableMetricRecord[]> => [],
  replaceMetrics: async () => ({ ok: true }),
};
