// Resolves the active Solana RPC endpoints for the SMPF wallet based on the
// admin-configured default_network in DUCWalletSettings.

const DEFAULTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

// CORS-friendly publicnode mirror for mainnet (api.mainnet-beta 403s browsers).
const MAINNET_PUBLICNODE = 'https://solana-rpc.publicnode.com';

function safeUrl(v) {
  return typeof v === 'string' && /^https?:\/\//.test(v) ? v : null;
}

export function getActiveNetwork(settings) {
  return settings?.default_network || 'mainnet';
}

// Ordered list of RPC endpoints to try for the selected network.
export function getNetworkRpcList(settings) {
  const net = getActiveNetwork(settings);
  if (net === 'testnet') {
    return Array.from(new Set([
      safeUrl(settings?.rpc_testnet) || DEFAULTS.testnet,
      DEFAULTS.testnet,
    ].filter(Boolean)));
  }
  if (net === 'devnet') {
    return Array.from(new Set([
      safeUrl(settings?.rpc_devnet) || DEFAULTS.devnet,
      DEFAULTS.devnet,
    ].filter(Boolean)));
  }
  // mainnet: CORS-friendly publicnode first, then configured + default.
  return Array.from(new Set([
    MAINNET_PUBLICNODE,
    safeUrl(settings?.rpc_mainnet),
    DEFAULTS.mainnet,
  ].filter(Boolean)));
}

// Solana Explorer suffix for the selected network.
export function getExplorerSuffix(settings) {
  const net = getActiveNetwork(settings);
  if (net === 'testnet') return '?cluster=testnet';
  if (net === 'devnet') return '?cluster=devnet';
  return '';
}