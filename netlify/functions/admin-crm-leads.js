const { getSupabase } = require('../../lib/supabase');
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError, parseJsonBody } = require('../../lib/http');

async function requireAdmin(event) {
  const session = readSessionFromEvent(event);
  if (!session) return null;
  const { data: user } = await getSupabase().from('users').select('id,email,username,role').eq('id', session.uid).single();
  return user && isApplicationAdmin(user) ? user : null;
}

exports.handler = async (event) => {
  if (!['GET', 'PATCH'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'PATCH']);
  try {
    const admin = await requireAdmin(event);
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const crm = getAdminSupabase();
    if (event.httpMethod === 'GET') {
      const { data, error } = await crm.from('crm_leads').select('*').order('notion_numeric_id', { ascending: false });
      if (error) throw error;
      return json({ leads: data || [] });
    }
    const body = parseJsonBody(event);
    if (!body.id || !body.patch || typeof body.patch !== 'object') return json({ error: 'invalid_request' }, { statusCode: 400 });
    const allowed = ['owner_names', 'lead_type', 'crm_stage', 'heat', 'comment', 'lost_at'];
    const update = Object.fromEntries(Object.entries(body.patch).filter(([key]) => allowed.includes(key)));
    const { data, error } = await crm.from('crm_leads').update(update).eq('id', body.id).select('*').single();
    if (error) throw error;
    return json({ lead: data });
  } catch (error) {
    console.error('admin-crm-leads error', error);
    return serverError(error);
  }
};
