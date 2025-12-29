import { parseAbi } from 'viem';

export const FIREPIT_ADDRESS = '0x0D5Cd355e2aBEB8fb1552F56c965B867346d6721';
export const TOKEN_JAR_ADDRESS = '0xf38521f130fccf29db1961597bc5d2b60f995f85';
export const UNI_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

export const FIREPIT_ABI = parseAbi([
    'function release(address[] tokens) external'
]);

export const ERC20_ABI = parseAbi([
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function approve(address spender, uint256 amount) external returns (bool)'
]);

// Common tokens to check in the jar
// Common tokens to check in the jar
// Removed hardcoded list in favor of dynamic fetching



export const UNI_COINGECKO_ID = 'uniswap';

export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
export const ALCHEMY_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
