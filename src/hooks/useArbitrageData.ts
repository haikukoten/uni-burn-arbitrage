import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { ERC20_ABI, TOKEN_JAR_ADDRESS, TRACKED_TOKENS, UNI_COINGECKO_ID, ALCHEMY_RPC_URL } from '../config';

// Alchemy Response Types
interface AlchemyTokenBalance {
    contractAddress: string;
    tokenBalance: string;
}

interface AlchemyResponse {
    jsonrpc: string;
    id: number;
    result: {
        address: string;
        tokenBalances: AlchemyTokenBalance[];
    };
}

// Helper to fetch balances from Alchemy
const fetchAlchemyBalances = async () => {
    if (!ALCHEMY_RPC_URL) throw new Error("Missing Alchemy RPC URL");

    const response = await fetch(ALCHEMY_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "alchemy_getTokenBalances",
            headers: { 'Content-Type': 'application/json' },
            params: [
                TOKEN_JAR_ADDRESS,
                "erc20",
            ],
            id: 42
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch from Alchemy');
    }

    const data: AlchemyResponse = await response.json();
    return data.result.tokenBalances.filter(t =>
        // Filter out zero balances and very small dust (at least some hex value)
        t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
};

// Helper to fetch prices from CoinGecko
const fetchPrices = async (ids: string) => {
    if (!ids) return {};
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!response.ok) {
        throw new Error('Failed to fetch prices');
    }
    return response.json();
};

export function useArbitrageData() {
    // 1. Fetch Balances via Alchemy
    const { data: alchemyBalances, isLoading: isAlchemyLoading } = useQuery({
        queryKey: ['alchemyBalances', TOKEN_JAR_ADDRESS],
        queryFn: fetchAlchemyBalances,
        refetchInterval: 60000
    });

    // 2. Identify tokens that need metadata (not in our hardcoded known list)
    const knownTokenMap = new Map(TRACKED_TOKENS.map(t => [t.address.toLowerCase(), t]));

    // List of addresses found by Alchemy
    const foundTokenAddresses = alchemyBalances?.map(b => b.contractAddress.toLowerCase()) || [];

    // Filter for ones we don't know
    const unknownTokenAddresses = foundTokenAddresses.filter(addr => !knownTokenMap.has(addr));

    // 3. Fetch Metadata for unknown tokens (Symbol, Decimals)
    const metadataContracts = unknownTokenAddresses.flatMap(address => [
        {
            address: address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'symbol',
        },
        {
            address: address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'decimals',
        }
    ]);

    const { data: metadataResults, isLoading: isMetadataLoading } = useReadContracts({
        contracts: metadataContracts,
        query: {
            enabled: unknownTokenAddresses.length > 0
        }
    });

    // 4. Construct Full Token List with Metadata
    // Combine Known + Fetched Metadata
    const unifiedTokens = alchemyBalances?.map(item => {
        const addr = item.contractAddress.toLowerCase();
        let symbol = '???';
        let decimals = 18;
        let coingeckoId = ''; // We might not know the ID for random tokens, default to empty or generic fetch

        // Case A: Known Token
        if (knownTokenMap.has(addr)) {
            const known = knownTokenMap.get(addr)!;
            symbol = known.symbol;
            decimals = 6; // Default fallback to 6? No, relying on known list defaults or hardcoded overrides in original code
            // Actually, original code had a 'knownDecimals' map inside the loop. Let's try to preserve or improve that.
            const knownDecimals: Record<string, number> = {
                'USDC': 6, 'USDT': 6, 'WBTC': 8, 'WETH': 18, 'DAI': 18
            };
            decimals = knownDecimals[known.symbol] || 18;
            coingeckoId = known.coingeckoId;
        }
        // Case B: Unknown Token (Recovered from metadata fetch)
        else {
            const index = unknownTokenAddresses.indexOf(addr);
            if (index !== -1 && metadataResults) {
                const symbolRes = metadataResults[index * 2];
                const decimalsRes = metadataResults[index * 2 + 1];

                if (symbolRes.status === 'success') symbol = symbolRes.result as string;
                if (decimalsRes.status === 'success') decimals = decimalsRes.result as number;
            }
            // For unknown tokens, we can't easily guess CoinGecko ID without another API call or huge map.
            // For now, we only fetch prices for KNOWN tokens.
        }

        return {
            address: item.contractAddress, // Keep original casing or normalize? Let's use what Alchemy gave or normalize.
            rawBalance: BigInt(item.tokenBalance),
            symbol,
            decimals,
            coingeckoId
        };
    }) || [];

    // 5. Fetch Prices
    // We only fetch prices for tokens where we have a coingeckoID
    const priceIds = [UNI_COINGECKO_ID, ...unifiedTokens.filter(t => t.coingeckoId).map(t => t.coingeckoId)];
    const uniqueIds = [...new Set(priceIds)].join(',');

    const { data: priceData, isLoading: pricesLoading } = useQuery({
        queryKey: ['coingeckoPrices', uniqueIds],
        queryFn: () => fetchPrices(uniqueIds),
        enabled: uniqueIds.length > 0,
        refetchInterval: 60000
    });

    const uniPrice = priceData?.[UNI_COINGECKO_ID]?.usd || 0;

    // 6. Calculate Finals
    const formattedData = unifiedTokens.map(token => {
        const balance = parseFloat(formatUnits(token.rawBalance, token.decimals));
        const price = token.coingeckoId ? (priceData?.[token.coingeckoId]?.usd || 0) : 0;
        const value = balance * price;

        return {
            ...token,
            balance,
            price,
            value
        };
    });

    // Check if we stumbled upon a token that IS known but wasn't in our initial list (Unlikely if TRACKED_TOKENS is all we care about for price, but good for future).
    // For now the logic is: If in TRACKED_TOKENS, we get price. If found dynamically and NOT in TRACKED_TOKENS, we show 0 price but correct balance.

    // Filter out tokens with 0 value if they are dust? Or keep them? User asked to "pull balance", implying they want to see everything.
    // Let's sort by value desc.
    const sortedData = formattedData.sort((a, b) => b.value - a.value);

    const totalJarValue = sortedData.reduce((acc, curr) => acc + curr.value, 0);
    const burnCost = 4000 * uniPrice;
    const netProfit = totalJarValue - burnCost;

    return {
        tokens: sortedData,
        totalJarValue,
        burnCost,
        netProfit,
        uniPrice,
        isLoading: isAlchemyLoading || isMetadataLoading || pricesLoading
    };
}
