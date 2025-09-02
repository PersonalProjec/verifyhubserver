import ProviderConfig from '../models/ProviderConfig.js';
import { PROVIDERS } from '../providers/catalog.js';
import { runProvider } from '../providers/index.js'; // used for ping (mock call)

function mergedProviderRow(key, cfg) {
  const base = PROVIDERS[key];
  if (!base) return null;
  return {
    key,
    label: base.label,
    fields: base.fields,
    enabled: cfg?.enabled ?? base.enabled ?? false,
    sandbox: cfg?.sandbox ?? base.sandbox ?? true,
    cost: cfg?.cost ?? base.cost ?? 5,
    baseUrl: cfg?.baseUrl || '',
    apiKeyMasked: cfg?.apiKey ? '••••••••' : '', // never expose the raw key
    updatedAt: cfg?.updatedAt || null,
  };
}

export async function listProvidersAdmin(req, res) {
  const cfgs = await ProviderConfig.find({}).lean();
  const map = Object.fromEntries(cfgs.map(c => [c.key, c]));
  const rows = Object.keys(PROVIDERS)
    .map(k => mergedProviderRow(k, map[k]))
    .filter(Boolean);
  res.json({ items: rows });
}

export async function getProviderAdmin(req, res) {
  const { key } = req.params;
  if (!PROVIDERS[key]) return res.status(404).json({ error: 'Unknown provider' });
  const cfg = await ProviderConfig.findOne({ key }).lean();
  res.json(mergedProviderRow(key, cfg));
}

export async function updateProviderAdmin(req, res) {
  const { key } = req.params;
  if (!PROVIDERS[key]) return res.status(404).json({ error: 'Unknown provider' });

  const { enabled, sandbox, cost, baseUrl, apiKey } = req.body || {};
  const update = {};
  if (typeof enabled === 'boolean') update.enabled = enabled;
  if (typeof sandbox === 'boolean') update.sandbox = sandbox;
  if (typeof cost === 'number') update.cost = Math.max(0, Math.floor(cost));
  if (typeof baseUrl === 'string') update.baseUrl = baseUrl.trim();
  if (typeof apiKey === 'string') {
    // store as-is; consider encrypting for production
    update.apiKey = apiKey.trim();
  }

  const cfg = await ProviderConfig.findOneAndUpdate(
    { key },
    { $set: update, $setOnInsert: { key } },
    { new: true, upsert: true }
  ).lean();

  res.json(mergedProviderRow(key, cfg));
}

// Quick connectivity check (safe/no secrets in response)
export async function pingProviderAdmin(req, res) {
  const { key } = req.params;
  if (!PROVIDERS[key]) return res.status(404).json({ error: 'Unknown provider' });

  try {
    // We don't want to hit live endpoints blindly.
    // So do a provider-specific light ping by calling verify() with a harmless payload
    // and require sandbox=true in config.
    const cfg = await ProviderConfig.findOne({ key }).lean();
    if (!cfg?.sandbox) return res.status(400).json({ error: 'Enable sandbox first' });

    // provider modules should special-case a ping payload or return early in sandbox
    const out = await runProvider(key, { __ping: true });
    res.json({ ok: true, data: out ? 'reachable' : 'ok' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Ping failed' });
  }
}
