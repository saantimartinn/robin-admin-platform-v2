export type PortalAdmin = { id: string; email: string; username?: string; nombre?: string; apellidos?: string };
export type PortalClient = { id: string; email?: string; nombre?: string; apellidos?: string; tipo?: string; assigned_to?: string; application_phase?: number; requires_onboarding?: boolean; pago_completed?: boolean; created_at?: string };
export type PortalPayment = { id: string; user_id: string; installment: number; amount: number; currency: string; status: string; invoice_number?: string; concept?: string };
export type PortalSnapshot = { admin: PortalAdmin; clients: PortalClient[]; payments: PortalPayment[]; connections: { stripe: boolean; holded: boolean; email: boolean }; portalUrl: string };

import { api, login, logout, me } from "@/robin-platform/portal-source/src/api.js";

export const portalClient = {
  login,
  me: me as () => Promise<PortalAdmin>,
  logout,
  snapshot: () => api.get("/api/admin/integration-snapshot") as Promise<PortalSnapshot>,
};
