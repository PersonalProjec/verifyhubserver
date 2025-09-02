// Static defaults (safe to ship to client, except secrets)
export const PROVIDERS = {
  waec: {
    label: 'WAEC Result',
    cost: 5,
    fields: [
      { name: 'examNumber', label: 'Exam Number', required: true },
      { name: 'examYear', label: 'Exam Year', required: true },
      { name: 'examType', label: 'Exam Type', required: true },
      { name: 'epin', label: 'e-PIN (optional)', required: false },
    ],
    enabled: false,
    sandbox: true,
  },
  neco: {
    label: 'NECO Result (e-Verify)',
    cost: 5,
    fields: [
      { name: 'examNumber', label: 'Exam Number', required: true },
      { name: 'examYear', label: 'Exam Year', required: true },
      { name: 'examType', label: 'Exam Type', required: true },
    ],
    enabled: false,
    sandbox: true,
  },
  nin: {
    label: 'NIN Lookup',
    cost: 5,
    fields: [{ name: 'nin', label: 'NIN', required: true }],
    enabled: false,
    sandbox: true,
  },
};

export function getProviderCost(name) {
  return PROVIDERS[name]?.cost ?? 5;
}

export function listCatalog() {
  return Object.entries(PROVIDERS).map(([key, v]) => ({
    key,
    label: v.label,
    cost: v.cost,
    fields: v.fields,
    enabled: !!v.enabled,
  }));
}
