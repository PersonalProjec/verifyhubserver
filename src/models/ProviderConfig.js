import mongoose from 'mongoose';

const providerConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true }, // 'waec', 'neco', 'nin'
    enabled: { type: Boolean, default: false },
    sandbox: { type: Boolean, default: true },
    cost: { type: Number, default: 5 },

    // Connection details (override ENV if set)
    baseUrl: { type: String, default: '' },
    apiKey: { type: String, default: '' }, // stored hashed? see note below
    meta: { type: Object }, // anything extra per provider
  },
  { timestamps: true }
);

export default mongoose.model('ProviderConfig', providerConfigSchema);
