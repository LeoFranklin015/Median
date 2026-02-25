"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_ALLOWANCES = exports.SUPPORTED_CHAINS = exports.ALCHEMY_RPC_URL = exports.ALCHEMY_API_KEY = exports.SESSION_DURATION = exports.AUTH_SCOPE = exports.USDC_TOKEN = exports.CHAIN_ID = void 0;
exports.getChainById = getChainById;
exports.getChainByName = getChainByName;
exports.default = getContractAddresses;
const chains_1 = require("viem/chains");
exports.CHAIN_ID = chains_1.base.id;
exports.USDC_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
exports.AUTH_SCOPE = 'Median App';
exports.SESSION_DURATION = 3600;
exports.ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
exports.ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${exports.ALCHEMY_API_KEY}`;
exports.SUPPORTED_CHAINS = {
    base: {
        id: 8453,
        name: 'Base',
        rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${exports.ALCHEMY_API_KEY}`,
        usdcToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
        adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
    },
};
function getChainById(chainId) {
    return Object.values(exports.SUPPORTED_CHAINS).find(c => c.id === chainId);
}
function getChainByName(name) {
    return exports.SUPPORTED_CHAINS[name];
}
exports.AUTH_ALLOWANCES = [
    { asset: 'usdc', amount: '100000000000' },
];
function getContractAddresses() {
    return {
        custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
        adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
    };
}
//# sourceMappingURL=config.js.map