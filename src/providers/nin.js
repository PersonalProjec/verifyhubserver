import { postJSON } from './http.js';
import ProviderConfig from '../models/ProviderConfig.js';

async function getCfg() {
  const cfg = await ProviderConfig.findOne({ key: 'nin' }).lean();
  return {
    enabled: cfg?.enabled ?? false,
    sandbox: cfg?.sandbox ?? true,
    baseUrl: cfg?.baseUrl || process.env.NIN_API_BASE || '',
    apiKey:  cfg?.apiKey  || process.env.NIN_API_KEY  || '',
    cost:    cfg?.cost ?? 5,
  };
}

export async function verify(payload) {
  const cfg = await getCfg();
  if (!cfg.enabled) throw new Error('Provider disabled');
  if (!cfg.baseUrl || !cfg.apiKey) throw new Error('NIN integration not configured');

  // allow ping path in sandbox
  if (payload?.__ping) {
    if (!cfg.sandbox) throw new Error('Sandbox disabled');
    return { ping: 'ok' };
  }

  const { examNumber, examYear, examType, epin } = payload;
  const body = { exam_number: examNumber, year: examYear, exam_type: examType };
  if (epin) body.epin = epin;

  const data = await postJSON(`${cfg.baseUrl}/nin/verify`, body, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });

  const normalized = {
    candidateName: data?.data?.name || null,
    examNumber, examYear, examType,
    grades: data?.data?.grades || null,
  };
  const verdict = data?.status === 'success' ? 'verified' : 'failed';
  return { verdict, normalized, raw: data };
}
