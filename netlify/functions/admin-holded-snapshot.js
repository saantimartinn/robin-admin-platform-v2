const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const holded = require('../../lib/holded');

const amount = (value) => Number(value || 0);
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const isoDate = (unix) => unix ? new Date(Number(unix) * 1000).toISOString().slice(0, 10) : null;

function statusFor(invoice, nowSec) {
  if (invoice.draft) return 'draft';
  if (Number(invoice.status) === 1 || amount(invoice.paymentsPending) <= 0) return 'paid';
  if (Number(invoice.status) === 2) return 'partial';
  if (Number(invoice.status) === 3 || (invoice.dueDate && Number(invoice.dueDate) < nowSec)) return 'overdue';
  return 'pending';
}

function totals(invoices, nowSec) {
  const valid = invoices.filter((invoice) => !invoice.draft);
  const billed = valid.reduce((sum, invoice) => sum + amount(invoice.total), 0);
  const collected = valid.reduce((sum, invoice) => sum + amount(invoice.paymentsTotal), 0);
  const pending = valid.reduce((sum, invoice) => sum + Math.max(0, amount(invoice.paymentsPending)), 0);
  const base = valid.reduce((sum, invoice) => sum + amount(invoice.subtotal), 0);
  const tax = valid.reduce((sum, invoice) => sum + amount(invoice.tax), 0);
  const statuses = valid.map((invoice) => statusFor(invoice, nowSec));
  return {
    billed: round(billed), base: round(base), tax: round(tax), collected: round(collected), pending: round(pending),
    overdue: round(valid.reduce((sum, invoice, index) => sum + (statuses[index] === 'overdue' ? Math.max(0, amount(invoice.paymentsPending)) : 0), 0)),
    invoices: valid.length,
    paidInvoices: statuses.filter((status) => status === 'paid').length,
    pendingInvoices: statuses.filter((status) => status === 'pending').length,
    partialInvoices: statuses.filter((status) => status === 'partial').length,
    overdueInvoices: statuses.filter((status) => status === 'overdue').length,
    drafts: invoices.filter((invoice) => invoice.draft).length,
    averageTicket: valid.length ? round(billed / valid.length) : 0,
    collectionRate: billed ? round(collected / billed * 100) : 0,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: admin, error } = await sb.from('users').select('id,email,username,role').eq('id', session.uid).single();
    if (error || !admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });

    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const queryStart = new Date(Math.min(yearStart.getTime(), trendStart.getTime()));
    const invoices = await holded.listSalesInvoices({ start: Math.floor(queryStart.getTime() / 1000), end: nowSec });
    const inRange = (invoice, start) => Number(invoice.date || 0) >= Math.floor(start.getTime() / 1000);
    const monthInvoices = invoices.filter((invoice) => inRange(invoice, monthStart));
    const yearInvoices = invoices.filter((invoice) => inRange(invoice, yearStart));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const rows = invoices.filter((invoice) => Number(invoice.date || 0) >= start.getTime() / 1000 && Number(invoice.date || 0) < end.getTime() / 1000);
      const summary = totals(rows, nowSec);
      return { month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(start), billed: summary.billed, collected: summary.collected, pending: summary.pending, invoices: summary.invoices };
    });

    return json({
      syncedAt: new Date().toISOString(),
      currency: String(invoices.find((invoice) => invoice.currency)?.currency || 'EUR').toUpperCase(),
      currentMonth: totals(monthInvoices, nowSec),
      currentYear: totals(yearInvoices, nowSec),
      last12Months: monthly,
      recentInvoices: invoices.slice(0, 50).map((invoice) => ({
        id: invoice.id,
        number: invoice.docNumber || 'Borrador',
        customer: invoice.contactName || 'Sin contacto',
        date: isoDate(invoice.date),
        dueDate: isoDate(invoice.dueDate),
        subtotal: round(amount(invoice.subtotal)),
        tax: round(amount(invoice.tax)),
        total: round(amount(invoice.total)),
        paid: round(amount(invoice.paymentsTotal)),
        pending: round(Math.max(0, amount(invoice.paymentsPending))),
        status: statusFor(invoice, nowSec),
        currency: String(invoice.currency || 'EUR').toUpperCase(),
      })),
    });
  } catch (error) {
    return serverError(error, 'admin.holded_snapshot');
  }
};
