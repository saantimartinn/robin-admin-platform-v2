"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  GraduationCap,
  Handshake,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Plane,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
  CircleX,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureModule } from "@/components/feature-modules";
import type { Contact, CrmStage, LeadCategory } from "@/types/domain";
import { portalClient } from "@/services/portal";
import type { PortalAdmin, PortalSnapshot } from "@/services/portal";
import { adminDataClient } from "@/services/admin-data";
import { integrationClient } from "@/services/integrations";
import type { HoldedSnapshot } from "@/services/integrations";
import robinPlanWordmark from "@/robin-subscriptions/portal-source/src/assets/robin-wordmark.png";
import { DashboardLoader } from "@/components/dashboard-loader";

type NavItem = [string, string, typeof LayoutDashboard];

const workspaceTabs = [
  ["/", "Inicio", "home"],
  ["/alumnos", "Portal del Alumno", "students"],
  ["/the-robin-plan", "The Robin Plan", "subscriptions"],
  ["/crm", "CRM", "crm"],
  ["/analiticas", "Analíticas", "analytics"],
  ["/campanas", "Campañas", "campaigns"],
] as const;

const sideMenus: Record<string, NavItem[]> = {
  home: [
    ["/", "Resumen", LayoutDashboard],
    ["/bandeja-leads", "Bandeja de leads", Inbox],
    ["/alumnos-global", "Vista de alumnos", GraduationCap],
    ["/analitica-global", "Analíticas generales", BarChart3],
    ["/pagos", "Pagos y facturación", CreditCard],
    ["/configuracion", "Configuración", Settings],
  ],
  students: [
    ["portal:inicio", "Resumen", LayoutDashboard],
    ["portal:clientes", "Mis clientes", Users],
    ["portal:notificaciones", "Notificaciones", Bell],
    ["portal:faqs", "FAQs", HelpCircle],
  ],
  subscriptions: [
    ["plan:panel", "Panel general", LayoutDashboard],
    ["plan:usuarios", "Usuarios", Users],
    ["plan:eventos", "Eventos", CalendarCheck],
    ["plan:grupos", "Grupos", Users],
    ["plan:asociaciones", "Asociaciones", Building2],
    ["plan:empleos", "Empleos", BriefcaseBusiness],
    ["plan:ofertas", "Ofertas", Tag],
    ["plan:viajes", "Viajes", Plane],
    ["plan:mentores", "Mentores", GraduationCap],
    ["plan:partners", "Partners", Handshake],
    ["plan:codigos", "Códigos", Percent],
    ["plan:notificaciones", "Notificaciones", Bell],
    ["plan:retos", "Retos", Sparkles],
    ["plan:faqs", "FAQs", HelpCircle],
  ],
  crm: [
    ["/crm", "Por contactar", UserCheck],
    ["/crm/contactados", "Contactados", Users],
    ["/crm/clientes", "Clientes", Sparkles],
    ["/crm/lost", "Lost", CircleX],
  ],
  analytics: [
    ["/analiticas/pagos", "Pagos y facturación", WalletCards],
    ["/analiticas/finanzas", "Finanzas", CircleDollarSign],
    ["/analiticas/operaciones", "Operaciones", PieChart],
    ["/analiticas/ventas", "Ventas", TrendingUp],
  ],
  campaigns: [["/campanas", "Meta Ads", BriefcaseBusiness]],
};

const areaNames: Record<string, string> = {
  home: "Inicio global",
  students: "Portal del Alumno",
  subscriptions: "The Robin Plan",
  crm: "CRM personal",
  analytics: "Analíticas personales",
  campaigns: "Campañas personales",
};

function getArea(path: string) {
  if (path === "/alumnos" || path.startsWith("/alumnos/")) return "students";
  if (path === "/the-robin-plan" || path.startsWith("/the-robin-plan/")) return "subscriptions";
  if (path.startsWith("/crm")) return "crm";
  if (path.startsWith("/analiticas")) return "analytics";
  if (path.startsWith("/campanas")) return "campaigns";
  return "home";
}

function isSideItemActive(path: string, href: string, portalSection = "inicio", subscriptionsSection = "panel") {
  if (href.startsWith("portal:")) return href === `portal:${portalSection}`;
  if (href.startsWith("plan:")) return href === `plan:${subscriptionsSection}`;
  if (href === "/") return path === "/";
  if (href === "/crm") return path === "/crm";
  if (href === "/campanas") return path.startsWith("/campanas");
  if (href === "/analiticas/pagos") return path === "/analiticas" || path === href;
  return path === href;
}

export function AdminApp({ authUser, onLogout }: { authUser: PortalAdmin; onLogout: () => Promise<void> }) {
  const path = window.location.pathname;
  const area = getArea(path);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [portalSection, setPortalSection] = useState("inicio");
  const [subscriptionsSection, setSubscriptionsSection] = useState("panel");
  const [admins, setAdmins] = useState(["Noel", "Manuel", "María"]);
  const [currentUser] = useState(() => advisorName(authUser));
  const [crmContacts, setCrmContacts] = useState<Contact[]>([]);
  const [leadOwners, setLeadOwners] = useState<Record<string, string>>({});
  const [leadStages, setLeadStages] = useState<Record<string, CrmStage>>({});
  const [leadCategories, setLeadCategories] = useState<Record<string, LeadCategory | "">>({});
  const [leadHeat, setLeadHeat] = useState<Record<string, number>>({});
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [leadLostDates, setLeadLostDates] = useState<Record<string, string>>({});
  const [crmLoaded, setCrmLoaded] = useState(false);
  const [portalSnapshot, setPortalSnapshot] = useState<PortalSnapshot | null>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [holdedSnapshot, setHoldedSnapshot] = useState<HoldedSnapshot | null>(null);
  const [holdedLoading, setHoldedLoading] = useState(true);
  const initials = currentUser.slice(0, 2).toUpperCase();

  function advisorName(user: PortalAdmin) {
    if (user.nombre) return user.nombre;
    const key = (user.email || user.username || "").split("@")[0].toLowerCase();
    return key === "maria" ? "María" : key ? key.charAt(0).toUpperCase() + key.slice(1) : "Administrador";
  }

  async function refreshPortalSnapshot() {
    setPortalLoading(true);
    try { setPortalSnapshot(await portalClient.snapshot()); }
    catch { setPortalSnapshot(null); }
    finally { setPortalLoading(false); }
  }

  function hydrateLeads(leads: Contact[]) {
    setCrmContacts(leads);
    setLeadOwners(Object.fromEntries(leads.map((lead) => [lead.id, lead.owner || ""])));
    setLeadStages(Object.fromEntries(leads.map((lead) => [lead.id, lead.stage || "Por contactar"])) as Record<string, CrmStage>);
    setLeadCategories(Object.fromEntries(leads.map((lead) => [lead.id, lead.category || ""])));
    setLeadHeat(Object.fromEntries(leads.map((lead) => [lead.id, lead.heat ?? 50])));
    setLeadNotes(Object.fromEntries(leads.map((lead) => [lead.id, lead.notes || ""])));
    setLeadLostDates(Object.fromEntries(leads.filter((lead) => lead.lostAt).map((lead) => [lead.id, lead.lostAt as string])));
  }

  function persistLead(id: string, patch: Parameters<typeof adminDataClient.updateLead>[1]) {
    void adminDataClient.updateLead(id, patch).catch((error) => setNotice(error instanceof Error ? error.message : "No se pudo guardar el lead"));
  }

  useEffect(() => {
    let active = true;
    const load = () => adminDataClient.listLeads().then((leads) => {
      if (active) hydrateLeads(leads);
    }).catch((error) => {
      if (active) setNotice(error instanceof Error ? error.message : "No se pudo cargar la base del gestor");
    }).finally(() => { if (active) setCrmLoaded(true); });
    void load();
    const unsubscribe = adminDataClient.subscribe(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    const syncSubscriptionsNavigation = (event: Event) => {
      const section = (event as CustomEvent<{ section?: string }>).detail?.section;
      if (section) setSubscriptionsSection(section);
    };
    window.addEventListener("robin:subscriptions-state", syncSubscriptionsNavigation);
    return () => window.removeEventListener("robin:subscriptions-state", syncSubscriptionsNavigation);
  }, []);

  useEffect(() => { void refreshPortalSnapshot(); }, [authUser.id]);

  useEffect(() => {
    let active = true;
    integrationClient.holded().then((data) => { if (active) setHoldedSnapshot(data); }).catch(() => { if (active) setHoldedSnapshot(null); }).finally(() => { if (active) setHoldedLoading(false); });
    return () => { active = false; };
  }, [authUser.id]);

  useEffect(() => {
    const syncPortalNavigation = (event: Event) => {
      const section = (event as CustomEvent<{ section?: string }>).detail?.section;
      if (section) setPortalSection(section);
    };
    window.addEventListener("robin:portal-state", syncPortalNavigation);
    return () => window.removeEventListener("robin:portal-state", syncPortalNavigation);
  }, []);

  function moveLead(id: string, stage: CrmStage) {
    setLeadStages((stages) => ({ ...stages, [id]: stage }));
    const lostAt = stage === "Lost" ? new Date().toISOString().slice(0, 10) : "";
    if (stage === "Lost") setLeadLostDates((dates) => ({ ...dates, [id]: lostAt }));
    persistLead(id, { stage, lostAt });
  }

  function addAdmin(name: string) {
    const cleanName = name.trim();
    if (!cleanName || admins.some((admin) => admin.toLowerCase() === cleanName.toLowerCase())) return;
    setAdmins((users) => [...users, cleanName]);
    setNotice(`${cleanName} se ha añadido al equipo de administración`);
  }

  const dashboardLoading =
    (!crmLoaded && (path === "/bandeja-leads" || path.startsWith("/crm"))) ||
    (portalLoading && ["/", "/alumnos-global", "/pagos"].includes(path));

  return (
    <div className={`shell ${area === "subscriptions" ? "subscriptions-shell" : ""}`}>
      <aside className={`${open ? "side open" : "side"} ${area === "subscriptions" ? "subscriptions-side" : ""}`}>
        <div className="brand">
          <img src={robinPlanWordmark} alt="ROBIN" />
          <div><small>ADMIN PLATFORM</small></div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"><X /></button>
        </div>
        <div className="context-title">
          <small>ESPACIO ACTUAL</small>
          <strong>{areaNames[area]}</strong>
          {area !== "home" && <span>Vista de {currentUser}</span>}
        </div>
        <nav>
          {sideMenus[area].map(([href, label, Icon]) => (
            <a href={href.startsWith("portal:") ? "/alumnos" : href.startsWith("plan:") ? "/the-robin-plan" : href} key={href} className={isSideItemActive(path, href, portalSection, subscriptionsSection) ? "active" : ""} onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              if (href.startsWith("portal:")) {
                window.dispatchEvent(new CustomEvent("robin:portal-navigate", { detail: { section: href.slice(7) } }));
              } else if (href.startsWith("plan:")) {
                window.dispatchEvent(new CustomEvent("robin:subscriptions-navigate", { detail: { section: href.slice(5) } }));
              } else {
                window.location.assign(href);
              }
            }}>
              <Icon /><span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="profile"><i>{initials}</i><div><strong>{currentUser}</strong><small>Administración</small></div></div>
      </aside>

      {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <div className="work">
        <header className="top">
          <button className="menub" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <nav className="workspace-tabs" aria-label="Áreas del gestor">
            {workspaceTabs.map(([href, label, tabArea]) => <a href={href} key={href} className={area === tabArea ? "active" : ""} onClick={(event) => { event.preventDefault(); event.stopPropagation(); window.location.assign(href); }}>{label}</a>)}
          </nav>
          <label className="global-search"><Search /><input placeholder="Buscar en Robin…" /><kbd>⌘ K</kbd></label>
          <div className="top-actions">
            <span className="authenticated-user">{currentUser}</span>
            <button aria-label="Notificaciones"><Bell /><i /></button>
            <button aria-label="Cerrar sesión" onClick={() => void onLogout()}><LogOut /></button>
          </div>
        </header>

        <main>
          {dashboardLoading || (path === "/" && holdedLoading) ? <div className="page"><DashboardLoader /></div> : path === "/" ? <Dashboard snapshot={portalSnapshot} contacts={crmContacts} leadStages={leadStages} currentUser={currentUser} holded={holdedSnapshot} /> : (
            <FeatureModule
              path={path}
              notify={setNotice}
              currentUser={currentUser}
              admins={admins}
              contacts={crmContacts}
              leadOwners={leadOwners}
              onAssignLead={(id, owner) => { setLeadOwners((owners) => ({ ...owners, [id]: owner })); persistLead(id, { owner }); }}
              leadStages={leadStages}
              onMoveLead={moveLead}
              leadCategories={leadCategories}
              onCategorizeLead={(id, category) => { setLeadCategories((categories) => ({ ...categories, [id]: category })); persistLead(id, { category }); }}
              leadHeat={leadHeat}
              onSetLeadHeat={(id, heat) => { setLeadHeat((values) => ({ ...values, [id]: heat })); persistLead(id, { heat }); }}
              leadNotes={leadNotes}
              onSetLeadNotes={(id, notes) => { setLeadNotes((values) => ({ ...values, [id]: notes })); persistLead(id, { notes }); }}
              leadLostDates={leadLostDates}
              portalSnapshot={portalSnapshot}
              portalConnected={true}
              portalAdmin={authUser}
              onPortalRefresh={refreshPortalSnapshot}
              onAddAdmin={addAdmin}
            />
          )}
        </main>
      </div>

      {notice && <div className="toast"><ShieldCheck /><span>{notice}</span><button onClick={() => setNotice("")}><X /></button></div>}
    </div>
  );
}

function AdminLogin({ onAuthenticated }: { onAuthenticated: (user: PortalAdmin) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await portalClient.login(username, password);
      const user = await portalClient.me();
      onAuthenticated(user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión");
    } finally { setBusy(false); }
  }
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}><span className="auth-mark">R</span><small>ROBIN ADMIN PLATFORM</small><h1>Acceso administrativo</h1><p>Usa las mismas credenciales que en el portal de aplicación.</p><label>Usuario o email<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="auth-error">{error}</div>}<Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button></form></div>;
}

function Head({ title, sub, action }: { title: string; sub: string; action?: string }) {
  return <header className="phead"><div><h2>{title}</h2><p>{sub}</p></div>{action && <button>{action}</button>}</header>;
}

function Dashboard({ snapshot, contacts, leadStages, currentUser, holded }: { snapshot: PortalSnapshot | null; contacts: Contact[]; leadStages: Record<string, CrmStage>; currentUser: string; holded: HoldedSnapshot | null }) {
  const [period, setPeriod] = useState<"7" | "15" | "30" | "all">("30");
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const dated = [...contacts.map((item) => item.createdAt), ...(snapshot?.clients || []).map((item) => item.created_at)].filter((value): value is string => Boolean(value));
  const periodDays = period === "all" ? null : Number(period);
  const earliest = dated.length ? new Date(Math.min(...dated.map((value) => new Date(value).getTime()))) : new Date(today);
  const rangeStart = periodDays ? new Date(today.getTime() - (periodDays - 1) * 86400000) : earliest;
  rangeStart.setHours(0, 0, 0, 0);
  const inRange = (value?: string) => Boolean(value && new Date(value) >= rangeStart && new Date(value) <= today);
  const periodLabel = period === "7" ? "Últimos 7 días" : period === "15" ? "Últimos 15 días" : period === "30" ? "Últimos 30 días" : "Todo el histórico";
  const clients = snapshot?.clients || [];
  const newLeads = contacts.filter((lead) => inRange(lead.createdAt));
  const newClients = clients.filter((client) => inRange(client.created_at));
  const activeLeads = contacts.filter((lead) => !["Cliente", "Lost"].includes(leadStages[lead.id] || lead.stage || "Por contactar"));
  const liveStats = [
    ["Leads activos", String(activeLeads.length), "CRM conectado", Users, "blue"],
    ["Nuevos leads", String(newLeads.length), periodLabel, Sparkles, "gold"],
    ["Clientes del portal", String(clients.length), `${clients.filter((client) => client.requires_onboarding).length} en onboarding`, GraduationCap, "green"],
    ["Facturado este año", holded ? `${Math.round(holded.currentYear.billed).toLocaleString("es-ES")} €` : "—", holded ? `${holded.currentYear.invoices} facturas en Holded` : "Holded no disponible", CircleDollarSign, "red"],
  ] as const;
  const visibleDays = Math.min(31, Math.max(1, Math.floor((today.getTime() - rangeStart.getTime()) / 86400000) + 1));
  const chartStart = new Date(today); chartStart.setDate(today.getDate() - visibleDays + 1); chartStart.setHours(0, 0, 0, 0);
  const dailyData = Array.from({ length: visibleDays }, (_, index) => {
    const start = new Date(chartStart); start.setDate(chartStart.getDate() + index);
    const end = new Date(start); end.setDate(start.getDate() + 1);
    const sameDay = (value?: string) => Boolean(value && new Date(value) >= start && new Date(value) < end);
    return { day: start.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", ""), leads: contacts.filter((lead) => sameDay(lead.createdAt)).length, clients: clients.filter((client) => sameDay(client.created_at)).length };
  });
  const hotLeads = contacts.filter((lead) => lead.owner === currentUser && (lead.heat || 0) >= 80 && !["Cliente", "Lost"].includes(leadStages[lead.id] || lead.stage || "Por contactar"));
  const funnelStages: Array<[string, CrmStage]> = [["Por contactar", "Por contactar"], ["Contactados", "Contactado"], ["Llamadas", "Llamada programada"], ["Propuestas", "Propuesta enviada"], ["Clientes", "Cliente"]];
  const funnel = funnelStages.map(([label, stage]) => [label, contacts.filter((lead) => (leadStages[lead.id] || lead.stage || "Por contactar") === stage).length] as const);
  const funnelBase = Math.max(1, contacts.length);
  const financeData = holded ? [{ label: "Facturado", value: holded.currentYear.billed }, { label: "Cobrado", value: holded.currentYear.collected }, { label: "Pendiente", value: holded.currentYear.pending }] : [];
  return (
    <div className="page">
      <div className="title">
        <div><span>INICIO COMPARTIDO</span><h1>Visión general de Robin</h1><p>Información común para todo el equipo de administración.</p></div>
        <label className="dashboard-period"><CalendarDays /><select value={period} onChange={(event) => setPeriod(event.target.value as "7" | "15" | "30" | "all")}><option value="7">Últimos 7 días</option><option value="15">Últimos 15 días</option><option value="30">Últimos 30 días</option><option value="all">Todo</option></select><ChevronDown /></label>
      </div>

      <section className="stats">
        {liveStats.map(([label, value, detail, Icon, tone]) => <article key={label}><i className={tone}><Icon /></i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}
      </section>

      <div className="grid">
        <section className="panel chart">
          <Head title="Nuevos leads y clientes" sub={`Altas diarias · ${periodLabel.toLowerCase()}`} />
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={dailyData} margin={{ left: -24, right: 10 }}><CartesianGrid vertical={false} stroke="#e8edf3" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="clients" name="Clientes" fill="#d69b3b" radius={[4,4,0,0]} /><Line type="monotone" dataKey="leads" name="Leads" stroke="#1f416f" strokeWidth={3} dot={{ r: 3 }} /></ComposedChart>
          </ResponsiveContainer>
        </section>

        <section className="panel attention">
          <Head title="Leads calientes" sub={`Heat igual o superior a 80 · ${currentUser}`} />
          <div>{hotLeads.length ? hotLeads.map((lead) => <button key={lead.id} onClick={() => window.location.assign("/crm")}><i className="red" /><div><strong>{lead.name}</strong><small>{leadStages[lead.id] || lead.stage}</small></div><em className="red">Heat {lead.heat}</em></button>) : <p className="empty-copy">No hay leads calientes asignados.</p>}</div>
        </section>
      </div>

      <div className="lower">
        <section className="panel">
          <Head title="Embudo de captación" sub="Fases reales del CRM" />
          <div className="funnel">{funnel.map(([label, value]) => <div key={label}><p><span>{label}</span><strong>{value}</strong></p><div><i style={{ width: `${Math.max(3, value / funnelBase * 100)}%` }} /></div></div>)}</div>
          <div className="conversion"><strong>{contacts.length ? `${(funnel[funnel.length - 1][1] / contacts.length * 100).toFixed(1)}%` : "0%"}</strong><span>Conversión total a cliente</span><b>{funnel[funnel.length - 1][1]} clientes</b></div>
        </section>

        <section className="panel">
          <Head title="Facturación anual" sub="Datos reales de Holded" />
          <ResponsiveContainer width="100%" height={210}><BarChart data={financeData} layout="vertical" margin={{ left: 24, right: 18 }}><CartesianGrid horizontal={false} stroke="#e8edf3" /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={72} /><Tooltip formatter={(value) => `${Number(value).toLocaleString("es-ES")} €`} /><Bar dataKey="value" fill="#1f416f" radius={[0,5,5,0]} /></BarChart></ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
