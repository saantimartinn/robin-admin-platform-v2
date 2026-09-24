"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  GraduationCap,
  Landmark,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Contact, CrmStage, LeadCategory } from "@/types/domain";
import { integrationClient } from "@/services/integrations";
import { adminDataClient } from "@/services/admin-data";
import type { FinanceSnapshot, MetaSnapshot } from "@/services/integrations";
import type { PortalAdmin, PortalSnapshot } from "@/services/portal";
import { RobinStudentsAdmin } from "@/components/robin-students-admin";
import { RobinSubscriptionsAdmin } from "@/components/robin-subscriptions-admin";
import { DashboardLoader } from "@/components/dashboard-loader";

type FeatureModuleProps = {
  path: string;
  notify: (message: string) => void;
  currentUser: string;
  admins: string[];
  contacts: Contact[];
  leadOwners: Record<string, string>;
  onAssignLead: (id: string, owner: string) => void;
  leadStages: Record<string, CrmStage>;
  onMoveLead: (id: string, stage: CrmStage) => void;
  leadCategories: Record<string, LeadCategory | "">;
  onCategorizeLead: (id: string, category: LeadCategory | "") => void;
  leadHeat: Record<string, number>;
  onSetLeadHeat: (id: string, heat: number) => void;
  leadNotes: Record<string, string>;
  onSetLeadNotes: (id: string, notes: string) => void;
  leadLostDates: Record<string, string>;
  portalSnapshot: PortalSnapshot | null;
  portalAdmin: PortalAdmin;
  portalConnected: boolean;
  onPortalRefresh: () => Promise<void>;
  onAddAdmin: (name: string) => void;
};

export function FeatureModule(props: FeatureModuleProps) {
  const { path } = props;
  if (path === "/bandeja-leads") return <LeadInbox {...props} />;
  if (path === "/alumnos-global") return <GlobalStudents snapshot={props.portalSnapshot} connected={props.portalConnected} contacts={props.contacts} />;
  if (path === "/analitica-global") return <GlobalAnalytics contacts={props.contacts} leadStages={props.leadStages} snapshot={props.portalSnapshot} />;
  if (path === "/pagos") return <GlobalPayments snapshot={props.portalSnapshot} connected={props.portalConnected} />;
  if (path === "/configuracion") return <Configuration {...props} />;
  if (path === "/alumnos" || path.startsWith("/alumnos/")) return <RobinStudentsAdmin user={props.portalAdmin} />;
  if (path === "/the-robin-plan" || path.startsWith("/the-robin-plan/")) return <RobinSubscriptionsAdmin user={props.portalAdmin} />;
  if (path.startsWith("/crm")) return <Crm {...props} />;
  if (path.startsWith("/analiticas")) return <PersonalAnalytics path={path} currentUser={props.currentUser} contacts={props.contacts} leadStages={props.leadStages} snapshot={props.portalSnapshot} />;
  if (path.startsWith("/campanas")) return <Campaigns currentUser={props.currentUser} notify={props.notify} />;
  return <div className="page"><div className="empty"><AlertTriangle /><h2>Vista no disponible</h2><p>Esta sección ya no forma parte de la nueva navegación.</p></div></div>;
}

function Title({ name, sub, eyebrow = "ROBIN ADMIN PLATFORM", children }: { name: string; sub: string; eyebrow?: string; children?: React.ReactNode }) {
  return <div className="title"><div><span>{eyebrow}</span><h1>{name}</h1><p>{sub}</p></div><div>{children}</div></div>;
}

function LeadInbox({ admins, contacts, leadOwners, leadStages, onAssignLead, notify }: FeatureModuleProps) {
  const [query, setQuery] = useState("");
  const list = useMemo(() => contacts.filter((contact) => `${contact.name} ${contact.email} ${contact.source}`.toLowerCase().includes(query.toLowerCase())), [contacts, query]);
  return (
    <div className="page">
      <Title name="Bandeja de entrada de leads" sub="Asigna cada nuevo lead al administrador que lo gestionará." eyebrow="INICIO · VISTA GLOBAL">
        <Badge variant="outline">{list.length} LEADS</Badge>
      </Title>
      <div className="module-toolbar">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, email o canal…" /></label>
        <Button variant="outline"><Filter />Filtros</Button>
      </div>
      <section className="panel inbox-panel">
        <div className="data-table">
          <table>
            <thead><tr><th>Lead</th><th>Origen</th><th>Estado</th><th>Valor</th><th>Asignar a</th></tr></thead>
            <tbody>
              {list.map((contact) => (
                <tr key={contact.id}>
                  <td><b>{contact.name}</b><small>{contact.email}</small></td>
                  <td>{contact.source}</td>
                  <td><Badge variant="outline">{leadStages[contact.id]}</Badge></td>
                  <td>{contact.value.toLocaleString("es-ES")} €</td>
                  <td>
                    <select
                      className="owner-select"
                      value={leadOwners[contact.id] || ""}
                      onChange={(event) => {
                        onAssignLead(contact.id, event.target.value);
                        notify(`${contact.name} asignado a ${event.target.value}`);
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {admins.map((admin) => <option key={admin}>{admin}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="assignment-note"><UserCheck /> Al asignar un lead, aparecerá inmediatamente en el CRM personal del usuario seleccionado.</p>
    </div>
  );
}

function GlobalStudents({ snapshot, connected, contacts }: { snapshot: PortalSnapshot | null; connected: boolean; contacts: Contact[] }) {
  const [selected, setSelected] = useState<Contact | null>(null);
  if (connected && !snapshot) return <div className="page"><Title name="Alumnos" sub="Sincronizando con el portal de aplicación." eyebrow="INICIO · VISTA GLOBAL" /><div className="empty compact"><GraduationCap /><h2>Cargando alumnos…</h2></div></div>;
  if (snapshot) return <div className="page"><Title name="Alumnos" sub="Clientes sincronizados con el portal de aplicación." eyebrow="INICIO · VISTA GLOBAL"><Badge variant="outline">{snapshot.clients.length} ALUMNOS</Badge></Title><div className="student-grid">{snapshot.clients.map((client) => <a key={client.id} className="student-card" href={`${snapshot.portalUrl}/portal/`} target="_blank" rel="noreferrer"><i>{`${client.nombre?.[0] || ""}${client.apellidos?.[0] || ""}` || "R"}</i><div><h3>{[client.nombre, client.apellidos].filter(Boolean).join(" ") || client.email}</h3><p>{client.email || "Sin email"}</p><span>{client.tipo || "general"} · Fase {client.application_phase || 1}</span></div><Badge variant="outline">{client.requires_onboarding ? "Onboarding" : "Activo"}</Badge><ChevronRight /></a>)}</div></div>;
  return (
    <div className="page">
      <Title name="Alumnos" sub="Vista global de alumnos y acceso a su perfil." eyebrow="INICIO · VISTA GLOBAL">
        <Button><Plus />Añadir alumno</Button>
      </Title>
      <div className="student-grid">
        {contacts.map((contact) => (
          <button key={contact.id} className="student-card" onClick={() => setSelected(contact)}>
            <i>{contact.initials}</i>
            <div><h3>{contact.name}</h3><p>{contact.university}</p><span>{contact.course}</span></div>
            <Badge variant="outline">{contact.status}</Badge>
            <ChevronRight />
          </button>
        ))}
      </div>
      {selected && <ContactDrawer contact={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ContactDrawer({ contact, onClose, heat = contact.heat || 50, notes = contact.notes || "", onHeatChange, onNotesChange, leadMode = false }: { contact: Contact; onClose: () => void; heat?: number; notes?: string; onHeatChange?: (value: number) => void; onNotesChange?: (value: string) => void; leadMode?: boolean }) {
  const [localHeat, setLocalHeat] = useState(heat);
  const [localNotes, setLocalNotes] = useState(notes);
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [sending, setSending] = useState(false);
  async function sendMessage() {
    if (!message.trim()) return;
    setSending(true);
    setMessageStatus("");
    try {
      await integrationClient.sendWhatsApp(contact.phone, message.trim());
      setMessage("");
      setMessageStatus("Mensaje enviado");
    } catch (error) {
      setMessageStatus(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    } finally { setSending(false); }
  }
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>×</button>
        <span>{leadMode ? "FICHA DEL LEAD" : "PERFIL DEL ALUMNO"}</span><h2>{contact.name}</h2><p>{contact.email} · {contact.phone}</p>
        <div className="detail-kpis"><article><small>{leadMode ? "Tipo" : "Progreso"}</small><strong>{leadMode ? contact.category || "—" : `${contact.probability}%`}</strong></article><article><small>Responsable</small><strong>{contact.owner}</strong></article></div>
        <section className="whatsapp-detail"><h3><MessageCircle /> WhatsApp</h3><p>{contact.phone}</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe un mensaje…" /><Button variant="outline" onClick={sendMessage} disabled={sending || !message.trim()}>{sending ? "Enviando…" : "Enviar por WhatsApp"}</Button>{messageStatus && <small>{messageStatus}</small>}</section>
        <section className="heat-control"><h3><Flame /> Heat del lead <b>{localHeat}</b></h3><input type="range" min="0" max="100" value={localHeat} onChange={(event) => { const value = Number(event.target.value); setLocalHeat(value); onHeatChange?.(value); }} /><div><span>Frío</span><span>Caliente</span></div></section>
        <section className="lead-notes"><h3>Notas del equipo</h3><textarea value={localNotes} onChange={(event) => { setLocalNotes(event.target.value); onNotesChange?.(event.target.value); }} placeholder="Añade contexto, objeciones y próximos pasos…" /><small>Guardado automáticamente en este espacio de trabajo.</small></section>
        {!leadMode && <><section><h3>Información académica</h3><dl><div><dt>Universidad</dt><dd>{contact.university}</dd></div><div><dt>Curso</dt><dd>{contact.course}</dd></div><div><dt>País</dt><dd>{contact.country}</dd></div></dl></section><section><h3>Próxima acción</h3><p>{contact.nextAction}</p></section></>}
      </aside>
    </div>
  );
}

function GlobalAnalytics({ contacts, leadStages, snapshot }: { contacts: Contact[]; leadStages: Record<string, CrmStage>; snapshot: PortalSnapshot | null }) {
  const [holded, setHolded] = useState<FinanceSnapshot | null>(null);
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; Promise.allSettled([integrationClient.holded(), integrationClient.meta()]).then(([h, m]) => { if (!active) return; if (h.status === "fulfilled") setHolded(h.value); if (m.status === "fulfilled") setMeta(m.value); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  if (loading) return <div className="page"><DashboardLoader /></div>;
  const clients = contacts.filter((lead) => (leadStages[lead.id] || lead.stage) === "Cliente").length;
  const conversion = contacts.length ? clients / contacts.length * 100 : 0;
  const stats = [
    ["Facturado este año", holded ? `${Math.round(holded.currentYear.billed).toLocaleString("es-ES")} €` : "—", holded ? `${holded.currentYear.invoices} facturas en Holded` : "Holded no disponible", CircleDollarSign],
    ["Conversión del CRM", `${conversion.toFixed(1)}%`, `${clients} de ${contacts.length} leads`, TrendingUp],
    ["Alumnos del portal", String(snapshot?.clients.length || 0), `${snapshot?.clients.filter((client) => client.requires_onboarding).length || 0} en onboarding`, GraduationCap],
    ["Coste por lead", meta ? `${meta.summary.cpl.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €` : "—", meta ? `${meta.summary.leads} leads atribuidos` : "Meta no disponible", BarChart3],
  ] as const;
  const months = holded?.last12Months || [];
  const maxBilled = Math.max(...months.map((month) => month.billed), 1);
  return (
    <div className="page">
      <Title name="Analíticas generales" sub="Rendimiento consolidado de Robin." eyebrow="INICIO · VISTA GLOBAL" />
      <section className="stats">{stats.map(([label, value, detail, Icon], index) => <article key={label}><i className={index === 1 ? "green" : index === 3 ? "gold" : ""}><Icon /></i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
      <div className="analytics-grid">
        <section className="panel metric-panel"><h2>Facturación mensual de Holded</h2><div className="metric-bars">{months.map((month) => <div key={month.month} title={`${month.label}: ${month.billed.toLocaleString("es-ES")} €`}><span style={{ height: `${Math.max(2, month.billed / maxBilled * 100)}%` }} /><small>{month.label}</small></div>)}</div></section>
        <section className="panel performance-list"><h2>Indicadores reales</h2>{[["Tasa de cobro", holded?.currentYear.collectionRate || 0, "green"], ["Conversión CRM", conversion, "blue"], ["CTR de Meta", meta?.summary.ctr || 0, "gold"], ["Alumnos sin onboarding", snapshot?.clients.length ? snapshot.clients.filter((client) => !client.requires_onboarding).length / snapshot.clients.length * 100 : 0, "gray"]].map(([label, raw, tone]) => { const value = Number(raw); return <div key={String(label)}><span>{label}</span><div><i className={String(tone)} style={{ width: `${Math.min(100, value)}%` }} /></div><strong>{value.toFixed(1)}%</strong></div>; })}</section>
      </div>
    </div>
  );
}

function GlobalPayments({ snapshot, connected }: { snapshot: PortalSnapshot | null; connected: boolean }) {
  const [holded, setHolded] = useState<FinanceSnapshot | null>(null);
  const [holdedLoading, setHoldedLoading] = useState(true);
  const [holdedMessage, setHoldedMessage] = useState("Conectando con Holded…");
  async function loadHolded() {
    setHoldedLoading(true);
    try {
      const data = await integrationClient.holded();
      setHolded(data);
      setHoldedMessage(`Sincronizado con Holded · ${new Date(data.syncedAt).toLocaleString("es-ES")}`);
    } catch (error) {
      setHoldedMessage(error instanceof Error ? error.message : "No se pudo conectar con Holded");
    } finally { setHoldedLoading(false); }
  }
  useEffect(() => { void loadHolded(); }, []);

  const euro = (value: number, currency = holded?.currency || "EUR") => `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`;
  const statusLabel: Record<string, string> = { paid: "Pagada", pending: "Pendiente", partial: "Pago parcial", overdue: "Vencida", draft: "Borrador" };
  const month = holded?.currentMonth;
  const year = holded?.currentYear;
  const maxMonthly = Math.max(...(holded?.last12Months.map((item) => item.billed) || [0]), 1);
  const byId = new Map((snapshot?.clients || []).map((client) => [client.id, client]));
  const portalBilled = (snapshot?.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const portalCollected = (snapshot?.payments || []).filter((payment) => payment.status === "paid").reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const portalPending = (snapshot?.payments || []).filter((payment) => payment.status !== "paid").reduce((total, payment) => total + Number(payment.amount || 0), 0);

  return <div className="page">
    <Title name="Pagos y facturación" sub="Facturación fiscal de Holded y cobros operativos del portal." eyebrow="INICIO · VISTA GLOBAL"><Button variant="outline" onClick={loadHolded} disabled={holdedLoading}><Landmark />{holdedLoading ? "Sincronizando…" : "Actualizar Holded"}</Button></Title>
    <div className="sync-status"><ShieldCheck /><span>{holdedMessage}</span><Badge variant="outline">HOLDED REAL</Badge></div>

    <div className="finance-group-title"><h2>Mes actual</h2><p>Facturas emitidas y cobros registrados en Holded.</p></div>
    <section className="stats mini">
      <article><i><FileText /></i><div><span>Facturado</span><strong>{euro(month?.billed || 0)}</strong><small>{month?.invoices || 0} facturas</small></div></article>
      <article><i className="green"><Check /></i><div><span>Cobrado</span><strong>{euro(month?.collected || 0)}</strong><small>{(month?.collectionRate || 0).toFixed(1)}% del facturado</small></div></article>
      <article><i className="gold"><CircleDollarSign /></i><div><span>Pendiente</span><strong>{euro(month?.pending || 0)}</strong><small>{month?.pendingInvoices || 0} abiertas · {month?.partialInvoices || 0} parciales</small></div></article>
      <article><i className="red"><AlertTriangle /></i><div><span>Vencido</span><strong>{euro(month?.overdue || 0)}</strong><small>{month?.overdueInvoices || 0} facturas vencidas</small></div></article>
    </section>

    <section className="ads-kpi-grid">
      <article><span>Base imponible · mes</span><strong>{euro(month?.base || 0)}</strong><small>Antes de impuestos</small></article>
      <article><span>Impuestos · mes</span><strong>{euro(month?.tax || 0)}</strong><small>IVA facturado</small></article>
      <article><span>Ticket medio · mes</span><strong>{euro(month?.averageTicket || 0)}</strong><small>Por factura</small></article>
      <article><span>Facturas pagadas · mes</span><strong>{month?.paidInvoices || 0}</strong><small>De {month?.invoices || 0} emitidas</small></article>
      <article><span>Facturado · año</span><strong>{euro(year?.billed || 0)}</strong><small>{year?.invoices || 0} facturas</small></article>
      <article><span>Cobrado · año</span><strong>{euro(year?.collected || 0)}</strong><small>{(year?.collectionRate || 0).toFixed(1)}% del facturado</small></article>
      <article><span>Pendiente · año</span><strong>{euro(year?.pending || 0)}</strong><small>{year?.pendingInvoices || 0} abiertas</small></article>
      <article><span>Vencido · año</span><strong>{euro(year?.overdue || 0)}</strong><small>{year?.overdueInvoices || 0} vencidas</small></article>
    </section>

    <section className="panel clean-chart"><div className="panel-heading"><div><h2>Facturación de los últimos 12 meses</h2><p>Importes emitidos en Holded</p></div></div><div className="metric-bars">{holded?.last12Months.map((item) => <div key={item.month} title={`${item.month}: ${euro(item.billed)}`}><span style={{ height: `${Math.max(2, item.billed / maxMonthly * 100)}%` }} /><small>{item.label}</small></div>)}</div></section>

    <section className="panel campaign-panel"><div className="panel-heading"><div><h2>Últimas facturas de Holded</h2><p>Desglose fiscal y estado de cobro</p></div></div><div className="data-table"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Fecha</th><th>Base</th><th>IVA</th><th>Total</th><th>Cobrado</th><th>Pendiente</th><th>Estado</th></tr></thead><tbody>{holded?.recentInvoices.map((invoice) => <tr key={invoice.id}><td><b>{invoice.number}</b></td><td>{invoice.customer}</td><td>{invoice.date ? new Date(`${invoice.date}T12:00:00`).toLocaleDateString("es-ES") : "—"}</td><td>{euro(invoice.subtotal, invoice.currency)}</td><td>{euro(invoice.tax, invoice.currency)}</td><td>{euro(invoice.total, invoice.currency)}</td><td>{euro(invoice.paid, invoice.currency)}</td><td>{euro(invoice.pending, invoice.currency)}</td><td><Badge variant="outline">{statusLabel[invoice.status] || invoice.status}</Badge></td></tr>)}</tbody></table></div></section>

    <div className="finance-group-title"><h2>Pagos del portal</h2><p>Cuotas previstas y cobros registrados en Supabase/Stripe.</p></div>
    {connected && !snapshot ? <div className="empty compact"><WalletCards /><h2>Cargando pagos del portal…</h2></div> : <>
      <section className="stats mini"><article><i><WalletCards /></i><div><span>Planificado</span><strong>{euro(portalBilled)}</strong><small>{snapshot?.payments.length || 0} cuotas</small></div></article><article><i className="green"><Check /></i><div><span>Cobrado</span><strong>{euro(portalCollected)}</strong><small>Stripe y transferencias</small></div></article><article><i className="gold"><CircleDollarSign /></i><div><span>Pendiente</span><strong>{euro(portalPending)}</strong><small>Cuotas abiertas o bloqueadas</small></div></article><article><i className="red"><AlertTriangle /></i><div><span>Fallidos</span><strong>{snapshot?.payments.filter((payment) => payment.status === "failed").length || 0}</strong><small>Requieren atención</small></div></article></section>
      <section className="panel"><div className="panel-heading"><div><h2>Cuotas del portal</h2><p>Estado financiero operativo</p></div></div><div className="data-table"><table><thead><tr><th>Cliente</th><th>Concepto</th><th>Importe</th><th>Estado</th><th>Factura</th></tr></thead><tbody>{snapshot?.payments.map((payment) => { const client = byId.get(payment.user_id); return <tr key={payment.id}><td><b>{[client?.nombre, client?.apellidos].filter(Boolean).join(" ") || client?.email || payment.user_id}</b></td><td>{payment.concept || `Cuota ${payment.installment}`}</td><td>{Number(payment.amount).toLocaleString("es-ES")} {payment.currency || "EUR"}</td><td><Badge variant="outline">{payment.status}</Badge></td><td>{payment.invoice_number || "—"}</td></tr>; })}</tbody></table></div></section>
    </>}
  </div>;
}

function Configuration({ admins, onAddAdmin, currentUser }: FeatureModuleProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="page">
      <Title name="Configuración" sub="Gestiona los usuarios con acceso al portal." eyebrow="INICIO · VISTA GLOBAL"><Button onClick={() => setAdding(true)}><UserPlus />Añadir usuario</Button></Title>
      {adding && (
        <form className="panel add-user-form" onSubmit={(event) => { event.preventDefault(); onAddAdmin(name); setName(""); setAdding(false); }}>
          <div><h2>Nuevo usuario administrador</h2><p>Añade un usuario con acceso al panel.</p></div>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del usuario" autoFocus />
          <Button type="submit">Añadir</Button><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancelar</Button>
        </form>
      )}
      <section className="admin-grid">
        {admins.map((admin) => <article className="panel" key={admin}><i>{admin.slice(0, 2).toUpperCase()}</i><div><h3>{admin}</h3><p>Administrador{admin === currentUser ? " · Usuario actual" : ""}</p></div><Badge variant="outline">Activo</Badge><button><MoreHorizontal /></button></article>)}
      </section>
    </div>
  );
}

function StudentPortal({ currentUser, snapshot }: { currentUser: string; snapshot: PortalSnapshot | null }) {
  return (
    <div className="page">
      <Title name="Portal de aplicación" sub={`Acceso personal de ${currentUser} al seguimiento de sus alumnos.`} eyebrow="ÁREA PERSONAL · ALUMNOS" />
      <section className="portal-placeholder">
        <i><GraduationCap /></i><Badge variant="outline">{snapshot ? "CONECTADO" : "VISTA PREVIA"}</Badge>
        <h2>Portal de aplicación</h2>
        <p>{snapshot ? "Abre el portal conectado para gestionar los expedientes asignados a tu cuenta." : "La URL real se habilitará al configurar Netlify."}</p>
        {snapshot ? <a className="portal-link-button" href={`${snapshot.portalUrl}/portal/`} target="_blank" rel="noreferrer"><ExternalLink />Abrir portal de aplicación</a> : <Button disabled><ExternalLink />URL pendiente de configurar</Button>}
      </section>
    </div>
  );
}

const leadCategories: LeadCategory[] = ["delft", "Llegada", "Mentoría", "General", "LATAM", "ESPECIAL"];
const salesStages: CrmStage[] = ["Contactado", "Propuesta enviada", "Llamada programada", "Llamada tenida", "En espera"];

function CategoryPicker({ value, onChange }: { value: LeadCategory | ""; onChange: (value: LeadCategory) => void }) {
  const [open, setOpen] = useState(false);
  return <div className={`category-picker ${open ? "open" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button type="button" className="category-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{value || "Seleccionar…"}</span><ChevronDown /></button>
    {open && <div className="category-options" role="listbox">{leadCategories.map((category) => <button type="button" role="option" aria-selected={value === category} key={category} onClick={() => { onChange(category); setOpen(false); }}>{category}</button>)}</div>}
  </div>;
}

function Crm({ path, currentUser, contacts, leadOwners, leadStages, onMoveLead, leadCategories: categories, onCategorizeLead, leadHeat, onSetLeadHeat, leadNotes, onSetLeadNotes, leadLostDates, portalSnapshot, portalConnected, onPortalRefresh, notify }: FeatureModuleProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [lostCategory, setLostCategory] = useState("");
  const [lostHeat, setLostHeat] = useState("0");
  const [lostFrom, setLostFrom] = useState("");
  const [lostTo, setLostTo] = useState("");
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const owned = useMemo(() => contacts.filter((contact) => leadOwners[contact.id] === currentUser && `${contact.name} ${contact.email} ${contact.source}`.toLowerCase().includes(query.toLowerCase())), [contacts, currentUser, leadOwners, query]);

  function openContact(contact: Contact) {
    setSelected({ ...contact, owner: currentUser, category: categories[contact.id] || undefined, heat: leadHeat[contact.id], notes: leadNotes[contact.id] });
  }

  async function dropLead(stage: CrmStage) {
    const leadId = draggingId;
    if (!leadId) return;
    setDraggingId(null);
    if (stage !== "Cliente") {
      onMoveLead(leadId, stage);
      notify(stage === "Lost" ? "Lead marcado como perdido" : `Lead movido a ${stage}`);
      return;
    }
    const contact = contacts.find((item) => item.id === leadId);
    const clientType = categories[leadId];
    if (!contact || !clientType) {
      notify("No se puede crear el cliente sin email y tipo de contrato");
      return;
    }
    setConvertingId(leadId);
    notify(`Creando la cuenta de ${contact.name} en el portal…`);
    try {
      const result = await integrationClient.convertLead({ leadId, name: contact.name, email: contact.email, advisor: currentUser, clientType });
      onMoveLead(leadId, "Cliente");
      await onPortalRefresh();
      if (result.result === "exists") notify(`${contact.name} ya existía en el portal y se ha vinculado como cliente`);
      else if (result.emailSent) notify(`Cuenta creada para ${contact.name} y correo de acceso enviado`);
      else notify(`Cuenta creada para ${contact.name}; el correo no pudo enviarse y queda pendiente`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo crear la cuenta en el portal");
    } finally { setConvertingId(null); }
  }

  function startDragging(leadId: string) {
    setDraggingId(leadId);
    window.requestAnimationFrame(() => boardWrapRef.current?.scrollTo({ left: boardWrapRef.current.scrollWidth, behavior: "smooth" }));
  }

  const title = path === "/crm/contactados" ? "Pipeline de contactados" : path === "/crm/clientes" ? "Clientes" : path === "/crm/lost" ? "Lost" : "Por contactar";
  return (
    <div className="page">
      <Title name={title} sub={`Cartera comercial de ${currentUser}.`} eyebrow="CRM PERSONAL"><Badge variant="outline">{owned.length} REGISTROS</Badge></Title>
      <div className="module-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en mi cartera…" /></label><Button variant="outline"><Filter />Filtros</Button></div>

      {path === "/crm" && (
        <div className="qualification-grid">
          {owned.filter((contact) => leadStages[contact.id] === "Por contactar").map((contact) => (
            <article className="qualification-card" key={contact.id}>
              <button className="card-main" onClick={() => openContact(contact)}><small>{contact.source}</small><h3>{contact.name}</h3><p>{contact.email}</p><span><Flame /> Heat {leadHeat[contact.id]}</span></button>
              <label>Categoría obligatoria<CategoryPicker value={categories[contact.id] || ""} onChange={(category) => onCategorizeLead(contact.id, category)} /></label>
              <Button disabled={!categories[contact.id]} onClick={() => { onMoveLead(contact.id, "Contactado"); notify(`${contact.name} ha pasado a Contactado`); }}>Pasar a contactado<ArrowRight /></Button>
            </article>
          ))}
          {!owned.some((contact) => leadStages[contact.id] === "Por contactar") && <div className="empty compact"><UserCheck /><h2>No hay leads por contactar</h2><p>Los nuevos leads asignados a {currentUser} aparecerán aquí.</p></div>}
        </div>
      )}

      {path === "/crm/contactados" && (
        <div className="crm-board-wrap" ref={boardWrapRef}>
          <div className="crm-board show-outcomes">
            {salesStages.map((stage) => (
              <section key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => void dropLead(stage)}>
                <header><strong>{stage}</strong><span>{owned.filter((contact) => leadStages[contact.id] === stage).length}</span></header>
                {owned.filter((contact) => leadStages[contact.id] === stage).map((contact) => (
                  <button draggable={!convertingId} disabled={convertingId === contact.id} className="pipeline-card" key={contact.id} onDragStart={() => startDragging(contact.id)} onDragEnd={() => setDraggingId(null)} onClick={() => openContact(contact)}>
                    <div><Badge variant="outline">{categories[contact.id] || "Sin categoría"}</Badge><span className={`heat-pill heat-${Math.ceil((leadHeat[contact.id] || 0) / 25)}`}><Flame />{leadHeat[contact.id]}</span></div>
                    <h3>{contact.name}</h3><p>{contact.source} · {contact.email}</p><small>{contact.lastContact}</small>
                  </button>
                ))}
              </section>
            ))}
            <aside className={`outcome-dropzones ${draggingId ? "active" : "inactive"}`}><div className="in-zone" onDragOver={(event) => event.preventDefault()} onDrop={() => void dropLead("Cliente")}><strong>IN</strong><span>{draggingId ? "Suelta para crear el cliente" : "Arrastra aquí para convertir"}</span></div><div className="lost-zone" onDragOver={(event) => event.preventDefault()} onDrop={() => void dropLead("Lost")}><strong>LOST</strong><span>{draggingId ? "Suelta para marcar la pérdida" : "Arrastra aquí para descartar"}</span></div></aside>
          </div>
          <p className="drag-hint">Arrastra las tarjetas entre columnas o hasta las zonas IN y LOST situadas después de En espera.</p>
        </div>
      )}

      {path === "/crm/clientes" && <div className="personal-leads">{portalConnected && !portalSnapshot ? <div className="empty compact"><GraduationCap /><h2>Cargando clientes…</h2></div> : portalSnapshot ? portalSnapshot.clients.filter((client) => client.assigned_to === portalSnapshot.admin.email).map((client) => <a className="lead-card" key={client.id} href={`${portalSnapshot.portalUrl}/portal/`} target="_blank" rel="noreferrer"><small>{client.tipo || "general"}</small><h3>{[client.nombre, client.apellidos].filter(Boolean).join(" ") || client.email}</h3><p>{client.email}</p><div><span>Fase {client.application_phase || 1}</span><strong>{client.pago_completed ? "Al corriente" : "Onboarding"}</strong></div><footer>Abrir en portal<ChevronRight /></footer></a>) : owned.filter((contact) => leadStages[contact.id] === "Cliente").map((contact) => <button className="lead-card" key={contact.id} onClick={() => openContact(contact)}><small>{categories[contact.id]}</small><h3>{contact.name}</h3><p>{contact.email}</p><div><span>Agente de venta: {currentUser}</span><strong>{contact.value.toLocaleString("es-ES")} €</strong></div><footer>Ver portal del cliente<ChevronRight /></footer></button>)}</div>}

      {path === "/crm/lost" && <><div className="lost-filters"><label>Desde<input type="date" value={lostFrom} onChange={(event) => setLostFrom(event.target.value)} /></label><label>Hasta<input type="date" value={lostTo} onChange={(event) => setLostTo(event.target.value)} /></label><label>Categoría<select value={lostCategory} onChange={(event) => setLostCategory(event.target.value)}><option value="">Todas</option>{leadCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Heat mínimo<input type="number" min="0" max="100" value={lostHeat} onChange={(event) => setLostHeat(event.target.value)} /></label></div><div className="data-table panel"><table><thead><tr><th>Lead</th><th>Categoría</th><th>Heat final</th><th>Origen</th><th>Fecha Lost</th></tr></thead><tbody>{owned.filter((contact) => { const lostDate = leadLostDates[contact.id] || ""; return leadStages[contact.id] === "Lost" && (!lostCategory || categories[contact.id] === lostCategory) && leadHeat[contact.id] >= Number(lostHeat || 0) && (!lostFrom || lostDate >= lostFrom) && (!lostTo || lostDate <= lostTo); }).map((contact) => <tr key={contact.id} onClick={() => openContact(contact)}><td><b>{contact.name}</b><small>{contact.email}</small></td><td>{categories[contact.id]}</td><td>{leadHeat[contact.id]}</td><td>{contact.source}</td><td>{leadLostDates[contact.id] || "—"}</td></tr>)}</tbody></table></div></>}

      {selected && <ContactDrawer contact={selected} leadMode heat={leadHeat[selected.id]} notes={leadNotes[selected.id]} onHeatChange={(value) => onSetLeadHeat(selected.id, value)} onNotesChange={(value) => onSetLeadNotes(selected.id, value)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PersonalAnalytics({ path, currentUser, contacts, leadStages, snapshot }: { path: string; currentUser: string; contacts: Contact[]; leadStages: Record<string, CrmStage>; snapshot: PortalSnapshot | null }) {
  const key = path.split("/").filter(Boolean)[1] || "pagos";
  if (key === "finanzas" || key === "pagos") return <FinanceAnalytics currentUser={currentUser} />;
  if (key === "ventas") return <SalesAnalytics currentUser={currentUser} contacts={contacts} leadStages={leadStages} />;
  const owned = contacts.filter((lead) => lead.owner === currentUser);
  const metrics = [
    { label: "Alumnos del portal", value: String(snapshot?.clients.length || 0), detail: "Datos del portal" },
    { label: "Leads asignados", value: String(owned.length), detail: currentUser },
    { label: "Clientes cerrados", value: String(owned.filter((lead) => (leadStages[lead.id] || lead.stage) === "Cliente").length), detail: "CRM" },
    { label: "En onboarding", value: String(snapshot?.clients.filter((client) => client.requires_onboarding).length || 0), detail: "Requieren seguimiento" },
  ];
  return <div className="page"><Title name="Operaciones" sub={`Carga operativa real · ${currentUser}`} eyebrow="ANALÍTICAS" /><ReadonlyMetricGrid metrics={metrics} /></div>;
}

function ReadonlyMetricGrid({ metrics }: { metrics: { label: string; value: string; detail: string }[] }) {
  return <section className="ads-kpi-grid">{metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</section>;
}

function FinanceAnalytics({ currentUser }: { currentUser: string }) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [syncMessage, setSyncMessage] = useState("Conectando con Holded…");
  const euro = (value: number) => `${Math.round(value).toLocaleString("es-ES")} €`;
  async function syncHolded() {
    setSyncing(true);
    try {
      const snapshot: FinanceSnapshot = await integrationClient.holded();
      setSnapshot(snapshot);
      setSyncMessage(`Sincronizado con Holded · ${snapshot.currentYear.invoices} facturas este año`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudo conectar con Holded");
    } finally { setSyncing(false); }
  }
  useEffect(() => { void syncHolded(); }, []);
  if (syncing) return <div className="page"><DashboardLoader /></div>;
  if (!snapshot) return <div className="page"><Title name="Finanzas" sub="No se pudieron cargar los datos de Holded." eyebrow="ANALÍTICAS" /><div className="empty compact"><Landmark /><h2>{syncMessage}</h2></div></div>;
  const m = snapshot.currentMonth, y = snapshot.currentYear;
  const monthMetrics = [{ label: "Facturado", value: euro(m.billed), detail: `${m.invoices} facturas` }, { label: "Base imponible", value: euro(m.base), detail: "Antes de impuestos" }, { label: "Impuestos", value: euro(m.tax), detail: "Registrados en Holded" }, { label: "Cobrado", value: euro(m.collected), detail: `${m.collectionRate.toFixed(1)}% del facturado` }, { label: "Pendiente", value: euro(m.pending), detail: `${m.pendingInvoices + m.partialInvoices} facturas` }, { label: "Vencido", value: euro(m.overdue), detail: `${m.overdueInvoices} facturas` }, { label: "Ticket medio", value: euro(m.averageTicket), detail: "Por factura" }];
  const yearMetrics = [{ label: "Facturado", value: euro(y.billed), detail: `${y.invoices} facturas` }, { label: "Cobrado", value: euro(y.collected), detail: `${y.paidInvoices} pagadas` }, { label: "Pendiente", value: euro(y.pending), detail: "Acumulado anual" }, { label: "Vencido", value: euro(y.overdue), detail: `${y.overdueInvoices} vencidas` }, { label: "Ticket medio", value: euro(y.averageTicket), detail: "Por factura" }, { label: "Tasa de cobro", value: `${y.collectionRate.toFixed(1)}%`, detail: "Cobrado / facturado" }];
  const max = Math.max(...snapshot.last12Months.map((item) => item.billed), 1);
  return <div className="page"><Title name="Finanzas" sub={`Datos fiscales reales de Holded · ${currentUser}`} eyebrow="ANALÍTICAS"><Button variant="outline" onClick={syncHolded} disabled={syncing}><Landmark />Actualizar Holded</Button></Title><div className="sync-status"><ShieldCheck /><span>{syncMessage}</span><Badge variant="outline">HOLDED</Badge></div><div className="finance-group"><div className="finance-group-title"><h2>Mes actual</h2><p>Importes calculados desde las facturas de Holded.</p></div><ReadonlyMetricGrid metrics={monthMetrics} /></div><section className="panel clean-chart"><h2>Facturación de los últimos 12 meses</h2><div className="metric-bars">{snapshot.last12Months.map((item) => <div key={item.month} title={`${item.label}: ${euro(item.billed)}`}><span style={{ height: `${Math.max(2, item.billed / max * 100)}%` }} /><small>{item.label}</small></div>)}</div></section><div className="finance-group"><div className="finance-group-title"><h2>Año actual</h2><p>Acumulado fiscal real.</p></div><ReadonlyMetricGrid metrics={yearMetrics} /></div></div>;
}

function SalesAnalytics({ currentUser, contacts, leadStages }: { currentUser: string; contacts: Contact[]; leadStages: Record<string, CrmStage> }) {
  const owned = contacts.filter((lead) => lead.owner === currentUser);
  const count = (stage: CrmStage) => owned.filter((lead) => (leadStages[lead.id] || lead.stage) === stage).length;
  const clients = count("Cliente");
  const stages: Array<[string, number]> = [["Leads asignados", owned.length], ["Contactados", count("Contactado")], ["Llamadas agendadas", count("Llamada programada")], ["Llamadas realizadas", count("Llamada tenida")], ["Propuestas", count("Propuesta enviada")], ["Clientes", clients]];
  const metrics = stages.map(([label, value]) => ({ label, value: String(value), detail: owned.length ? `${(value / owned.length * 100).toFixed(1)}% de la cartera` : "Sin leads asignados" }));
  const sources = [...new Set(owned.map((lead) => lead.source))].map((source) => { const rows = owned.filter((lead) => lead.source === source); const wins = rows.filter((lead) => (leadStages[lead.id] || lead.stage) === "Cliente").length; return [source, String(rows.length), String(wins), rows.length ? `${(wins / rows.length * 100).toFixed(1)}%` : "0%"] as string[]; });
  return <div className="page"><Title name="Ventas" sub={`Embudo real de la cartera de ${currentUser}`} eyebrow="ANALÍTICAS" /><ReadonlyMetricGrid metrics={metrics} /><section className="panel sales-funnel"><h2>Embudo de conversión</h2>{stages.map(([label, value]) => <div key={label}><p><span>{label}</span><strong>{value}</strong></p><i><b style={{ width: `${owned.length ? Math.max(2, value / owned.length * 100) : 0}%` }} /></i></div>)}</section><PerformanceTable title="Rendimiento por origen" rows={sources.map(([source, leads, wins, conversion]) => [source, leads, wins, conversion])} /></div>;
}

function PerformanceTable({ title, rows }: { title: string; rows: string[][] }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2><p>Datos calculados desde el CRM</p></div></div><div className="data-table"><table><thead><tr><th>Origen</th><th>Leads</th><th>Clientes</th><th>Conversión</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 0 ? <b>{cell}</b> : cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Campaigns({ currentUser, notify }: { currentUser: string; notify: (message: string) => void }) {
  const [snapshot, setSnapshot] = useState<MetaSnapshot | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [connection, setConnection] = useState("Conectando con Meta Marketing API…");
  async function syncMeta() {
    setSyncing(true);
    try {
      const data = await integrationClient.meta();
      setSnapshot(data);
      setConnection(`Sincronizado con ${data.account.name} · ${new Date(data.syncedAt).toLocaleString("es-ES")}`);
    }
    catch (error) { setConnection(error instanceof Error ? error.message : "No se pudo conectar con Meta"); }
    finally { setSyncing(false); }
  }
  useEffect(() => { void syncMeta(); }, []);
  const euro = (value: number) => `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
  const summary = snapshot?.summary ?? { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpc: 0, cpm: 0, leads: 0, purchases: 0, revenue: 0, cpl: 0, cac: 0, roas: 0 };
  const maxSpend = Math.max(...(snapshot?.daily.map((day) => day.spend) ?? [0]), 1);
  const maxCpm = Math.max(...(snapshot?.daily.map((day) => day.cpm) ?? [0]), 1);
  const statusLabel: Record<string, string> = { ACTIVE: "Activa", PAUSED: "Pausada", ARCHIVED: "Archivada", DELETED: "Eliminada", CAMPAIGN_PAUSED: "Pausada", ADSET_PAUSED: "Pausada", IN_PROCESS: "En revisión", WITH_ISSUES: "Con incidencias" };
  if (syncing && !snapshot) return <div className="page"><DashboardLoader /></div>;
  return (
    <div className="page">
      <Title name="Meta Ads" sub={`Resultados reales de la cuenta publicitaria · acceso de ${currentUser}.`} eyebrow="CAMPAÑAS"><Button variant="outline" onClick={syncMeta} disabled={syncing}><Megaphone />{syncing ? "Sincronizando…" : "Actualizar datos"}</Button></Title>
      <div className="meta-banner"><ShieldCheck /><div><strong>{connection}</strong><p>Periodo: últimos 30 días · importes en {snapshot?.account.currency || "EUR"} · zona horaria {snapshot?.account.timezone || "de la cuenta"}</p></div><Badge variant="outline">DATOS REALES</Badge></div>
      <section className="ads-kpi-grid">{[
        ["Inversión", euro(summary.spend), "Gasto total"], ["Impresiones", summary.impressions.toLocaleString("es-ES"), `${(summary.impressions / 1000).toFixed(1)}k`], ["Clics", summary.clicks.toLocaleString("es-ES"), `${summary.ctr.toFixed(2)}% CTR`], ["CTR", `${summary.ctr.toFixed(2)}%`, "Clics / impresiones"],
        ["CPC medio", euro(summary.cpc), "Coste por clic"], ["CPM", euro(summary.cpm), "Coste por mil"], ["Alcance", summary.reach.toLocaleString("es-ES"), "Personas únicas"], ["Leads", summary.leads.toLocaleString("es-ES"), "Conversiones atribuidas"],
        ["CPL real", euro(summary.cpl), "Inversión / leads"], ["Ventas", summary.purchases.toLocaleString("es-ES"), "Compras atribuidas"], ["CAC", euro(summary.cac), "Inversión / ventas"], ["ROAS", `${summary.roas.toFixed(2)}×`, euro(summary.revenue)],
      ].map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section>
      <div className="sales-analysis-grid"><section className="panel clean-chart"><h2>Inversión diaria</h2><div className="metric-bars">{snapshot?.daily.map((day) => <div key={day.date} title={`${day.date}: ${euro(day.spend)}`}><span style={{ height: `${Math.max(2, day.spend / maxSpend * 100)}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit" })}</small></div>)}</div></section><section className="panel clean-chart"><h2>CPM diario</h2><div className="metric-bars gold-bars">{snapshot?.daily.map((day) => <div key={day.date} title={`${day.date}: ${euro(day.cpm)}`}><span style={{ height: `${Math.max(2, day.cpm / maxCpm * 100)}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit" })}</small></div>)}</div></section></div>
      <section className="panel campaign-panel"><div className="panel-heading"><div><h2>Campañas</h2><p>Datos reales · últimos 30 días</p></div></div><div className="data-table"><table><thead><tr><th>Campaña</th><th>Estado</th><th>Inversión</th><th>Leads</th><th>CPL</th><th>ROAS</th></tr></thead><tbody>{snapshot?.campaigns.map((row) => <tr key={row.id}><td><b>{row.name}</b><small>ID: {row.id}</small></td><td><Badge variant="outline">{statusLabel[row.status] || row.status}</Badge></td><td>{euro(row.spend)}</td><td>{row.leads.toLocaleString("es-ES")}</td><td>{euro(row.cpl)}</td><td>{row.roas.toFixed(2)}×</td></tr>)}{snapshot && snapshot.campaigns.length === 0 && <tr><td colSpan={6}>No hay campañas con entrega en los últimos 30 días.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
