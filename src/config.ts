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
export const TRACKED_TOKENS = [
    {
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        coingeckoId: 'usd-coin'
    },
    {
        symbol: 'USDT',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        coingeckoId: 'tether'
    },
    {
        symbol: 'WETH',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        coingeckoId: 'ethereum'
    },
    {
        symbol: 'WBTC',
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        coingeckoId: 'bitcoin'
    },
    {
        symbol: 'DAI',
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        coingeckoId: 'dai'
    },
];


export const UNI_COINGECKO_ID = 'uniswap';

export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
export const ALCHEMY_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
