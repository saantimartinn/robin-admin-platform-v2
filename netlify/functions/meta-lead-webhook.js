const crypto = require('crypto');
const { ingestCrmLead } = require('../../lib/crm-lead-ingest');
const { json, methodNotAllowed, parseJsonBody, safeEqual, serverError } = require('../../lib/http');

function fieldMap(fields = []) {
  return Object.fromEntries(fields.map((field) => [field.name, Array.isArray(field.values) ? field.values[0] : field.values]));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q['hub.mode'] === 'subscribe' && safeEqual(q['hub.verify_token'], process.env.META_WEBHOOK_VERIFY_TOKEN || '')) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: q['hub.challenge'] || '' };
    }
    return json({ error: 'verification_failed' }, { statusCode: 403 });
  }
  if (event.httpMethod !== 'POST') return methodNotAllowed(['GET', 'POST']);
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
    const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET || '').update(raw).digest('hex');
    if (!process.env.META_APP_SECRET || !safeEqual(signature, expected)) return json({ error: 'invalid_signature' }, { statusCode: 401 });
    const body = parseJsonBody(event);
    const changes = (body?.entry || []).flatMap((entry) => (entry.changes || []).map((change) => ({ entry, change })));
    const leadEvents = changes.filter(({ change }) => change.field === 'leadgen' && change.value?.leadgen_id);
    const version = process.env.META_API_VERSION || 'v26.0';
    for (const { change } of leadEvents) {
      const id = change.value.leadgen_id;
      // Meta's webhook console uses all-4 placeholder IDs. Acknowledge that
      // transport test without trying to fetch or persist a fictitious lead.
      if (/^4+$/.test(String(id)) && /^4+$/.test(String(change.value.page_id || ''))) continue;
      const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}`);
      url.searchParams.set('fields', 'id,created_time,field_data,form_id,ad_id');
      url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN || '');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`meta_lead_fetch_${response.status}`);
      const lead = await response.json();
      const fields = fieldMap(lead.field_data);
      await ingestCrmLead({ source: 'meta', externalId: lead.id, name: fields.full_name || fields.name, email: fields.email, phone: fields.phone_number || fields.phone, createdAt: lead.created_time, campaign: change.value.ad_id ? `meta-ad:${change.value.ad_id}` : null, payload: { form_id: lead.form_id || change.value.form_id, ad_id: lead.ad_id || change.value.ad_id, field_data: fields } });
    }
    return json({ ok: true, received: leadEvents.length });
  } catch (error) { return serverError(error, 'crm.meta_webhook'); }
};
