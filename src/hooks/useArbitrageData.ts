import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { ERC20_ABI, TOKEN_JAR_ADDRESS, TRACKED_TOKENS, UNI_COINGECKO_ID } from '../config';

// Helper to fetch prices from CoinGecko
const fetchPrices = async () => {
    const ids = [...TRACKED_TOKENS.map(t => t.coingeckoId), UNI_COINGECKO_ID].join(',');
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!response.ok) {
        throw new Error('Failed to fetch prices');
    }
    return response.json();
};

export function useArbitrageData() {
    // 1. Balances
    const balanceContracts = TRACKED_TOKENS.map(token => ({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [TOKEN_JAR_ADDRESS as `0x${string}`]
    }));

    const { data: balanceData, isLoading: balancesLoading } = useReadContracts({
        contracts: balanceContracts
    });

    // 2. Prices via CoinGecko
    const { data: priceData, isLoading: pricesLoading } = useQuery({
        queryKey: ['coingeckoPrices'],
        queryFn: fetchPrices,
        refetchInterval: 60000 // Refresh every minute
    });

    const uniPrice = priceData?.[UNI_COINGECKO_ID]?.usd || 0;

    const formattedData = TRACKED_TOKENS.map((token, index) => {
        const rawBalance = (balanceData?.[index]?.result as unknown as bigint) || 0n;
        // Known decimals for mainnet tokens
        const knownDecimals: Record<string, number> = {
            'USDC': 6, 'USDT': 6, 'WBTC': 8, 'WETH': 18, 'DAI': 18
        };
        const decimals = knownDecimals[token.symbol] || 18;

        const balance = parseFloat(formatUnits(rawBalance, decimals));
        const price = priceData?.[token.coingeckoId]?.usd || 0;
        const value = balance * price;

        return {
            ...token,
            rawBalance,
            decimals,
            balance,
            price,
            value
        };
    });

    const totalJarValue = formattedData.reduce((acc, curr) => acc + curr.value, 0);
    const burnCost = 4000 * uniPrice;
    const netProfit = totalJarValue - burnCost;

    return {
        tokens: formattedData,
        totalJarValue,
        burnCost,
        netProfit,
        uniPrice,
        isLoading: balancesLoading || pricesLoading
    };
}
