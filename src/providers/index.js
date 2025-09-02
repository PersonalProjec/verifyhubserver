import * as waec from './waec.js';
import * as neco from './neco.js';
import * as nin  from './nin.js';

export const registry = { waec, neco, nin };

export async function runProvider(name, fields) {
  const p = registry[name];
  if (!p?.verify) throw new Error(`Unknown provider: ${name}`);
  return p.verify(fields);
}
