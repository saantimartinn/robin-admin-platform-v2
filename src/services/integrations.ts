export type IntegrationStatus = { holded: boolean; meta: boolean; stripe: boolean; email: boolean; applicationPortal: boolean; adminDatabase: boolean };
export type FinanceTotals = { billed: number; base: number; tax: number; collected: number; pending: number; overdue: number; invoices: number; paidInvoices: number; pendingInvoices: number; partialInvoices: number; overdueInvoices: number; drafts: number; averageTicket: number; collectionRate: number };
export type HoldedSnapshot = { syncedAt: string; currency: string; currentMonth: FinanceTotals; currentYear: FinanceTotals; last12Months: { month: string; label: string; billed: number; collected: number; pending: number; invoices: number }[]; recentInvoices: { id: string; number: string; customer: string; date: string | null; dueDate: string | null; subtotal: number; tax: number; total: number; paid: number; pending: number; status: string; currency: string }[] };
export type FinanceSnapshot = HoldedSnapshot;
export type MetaMetrics = { spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpc: number; cpm: number; leads: number; purchases: number; revenue: number; cpl: number; cac: number; roas: number };
export type MetaCampaign = MetaMetrics & { id: string; name: string; status: string };
export type MetaSnapshot = { period: string; account: { id: string; name: string; currency: string; timezone: string }; summary: MetaMetrics; campaigns: MetaCampaign[]; daily: { date: string; spend: number; cpm: number }[]; syncedAt: string };
export const integrationClient = {
  status: async (): Promise<IntegrationStatus> => ({ holded: false, meta: false, stripe: false, email: false, applicationPortal: false, adminDatabase: false }),
  holded: async (): Promise<HoldedSnapshot> => {
    const response = await fetch('/api/admin/holded/snapshot', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || 'No se pudieron cargar los datos de Holded');
    return payload as HoldedSnapshot;
  },
  meta: async (): Promise<MetaSnapshot> => {
    const response = await fetch('/api/admin/meta/insights', { credentials: 'include' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || 'No se pudieron cargar las estadísticas de Meta');
    return payload as MetaSnapshot;
  },
  sendWhatsApp: async () => ({ messageId: "demo" }),
  convertLead: async (lead: { leadId: string; name: string; email: string; advisor: string; clientType: string }) => {
    const response = await fetch("/api/internal/crm/convert", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(lead) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages: Record<string, string> = { lead_email_required: "El lead necesita un email antes de pasar a IN", identity_collision: "Ya existe un usuario con ese email o identificador", invalid_bootstrap_password_configuration: "Falta configurar una contraseña inicial válida" };
      throw new Error(messages[payload.error] || payload.detail || "No se pudo crear el alumno en el portal");
    }
    return payload as { result: "created" | "exists"; userId: string; emailSent: boolean; loginUrl: string };
  },
};
