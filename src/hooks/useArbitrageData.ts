import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { ERC20_ABI, TOKEN_JAR_ADDRESS, ALCHEMY_RPC_URL } from '../config';

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
        pageKey?: string; // Added pageKey for pagination
    };
}

// Helper to fetch balances from Alchemy with pagination
const fetchAlchemyBalances = async () => {
    if (!ALCHEMY_RPC_URL) throw new Error("Missing Alchemy RPC URL");

    let allBalances: AlchemyTokenBalance[] = [];
    let pageKey: string | undefined = undefined;

    do {
        const response: Response = await fetch(ALCHEMY_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "alchemy_getTokenBalances",
                headers: { 'Content-Type': 'application/json' },
                params: [
                    TOKEN_JAR_ADDRESS,
                    "erc20",
                    pageKey ? { pageKey } : {}
                ],
                id: 42
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Alchemy');
        }

        const data: AlchemyResponse = await response.json();
        const result = data.result;

        if (result.tokenBalances) {
            allBalances = [...allBalances, ...result.tokenBalances];
        }

        pageKey = result.pageKey;

    } while (pageKey);

    return allBalances.filter(t =>
        // Filter out zero balances and very small dust
        t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
};

// Helper to fetch prices from DEXScreener (Batched)
// DEXScreener is better for long-tail/meme tokens than CoinGecko or Chainlink
const fetchPrices = async (addresses: string[]) => {
    if (!addresses.length) return {};

    // Chunking: DEXScreener allows ~30 addresses per call
    const CHUNK_SIZE = 30;
    const chunks = [];
    for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
        chunks.push(addresses.slice(i, i + CHUNK_SIZE));
    }

    const results = await Promise.all(chunks.map(async (chunk) => {
        const ids = chunk.join(',');
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
        if (!response.ok) {
            console.error('Failed to fetch prices for chunk', chunk);
            return {};
        }
        const data = await response.json();
        const pairs = data.pairs || [];

        // Map address -> price
        const priceMap: Record<string, number> = {};
        pairs.forEach((pair: any) => {
            const addr = pair.baseToken.address.toLowerCase();
            const price = parseFloat(pair.priceUsd);
            // If we already have a price, we might want to keep the one with higher liquidity, 
            // but DEXScreener often returns best pair first.
            if (!priceMap[addr]) {
                priceMap[addr] = price;
            }
        });
        return priceMap;
    }));

    // Merge all results
    return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
};

export function useArbitrageData() {
    // 1. Fetch Balances via Alchemy
    const { data: alchemyBalances, isLoading: isAlchemyLoading } = useQuery({
        queryKey: ['alchemyBalances', TOKEN_JAR_ADDRESS],
        queryFn: fetchAlchemyBalances,
        refetchInterval: 60000
    });

    // 2. Identify tokens that need metadata
    // We treat all tokens as "Unknown" to ensure we fetch metadata for everything dynamically
    const foundTokenAddresses = alchemyBalances?.map(b => b.contractAddress.toLowerCase()) || [];

    // 3. Fetch Metadata for ALL tokens (Symbol, Decimals)
    const metadataContracts = foundTokenAddresses.flatMap(address => [
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
            enabled: foundTokenAddresses.length > 0
        }
    });

    // 4. Construct Full Token List with Metadata
    const unifiedTokens = alchemyBalances?.map(item => {
        const addr = item.contractAddress.toLowerCase();
        let symbol = '???';
        let decimals = 18;

        const index = foundTokenAddresses.indexOf(addr);
        if (index !== -1 && metadataResults) {
            const symbolRes = metadataResults[index * 2];
            const decimalsRes = metadataResults[index * 2 + 1];

            if (symbolRes.status === 'success') symbol = symbolRes.result as string;
            if (decimalsRes.status === 'success') decimals = decimalsRes.result as number;
        }

        return {
            address: item.contractAddress,
            rawBalance: BigInt(item.tokenBalance),
            symbol,
            decimals
        };
    }) || [];

    // Filter out ignored tokens (e.g. UNI-V2 LP tokens)
    const filteredTokens = unifiedTokens.filter(t => t.symbol?.toUpperCase() !== 'UNI-V2');

    // 5. Fetch Prices via DEXScreener
    // We fetch for ALL filtered tokens + UNI price
    const tokenAddressesToFetch = filteredTokens.map(t => t.address);
    const uniAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
    const allAddresses = [...tokenAddressesToFetch, uniAddress];

    // Create a key for query cache that is stable but unique enough
    const queryKey = allAddresses.join(',');

    const { data: priceData, isLoading: pricesLoading } = useQuery({
        queryKey: ['dexScreenerPrices', queryKey],
        queryFn: () => fetchPrices(allAddresses),
        enabled: allAddresses.length > 0,
        refetchInterval: 60000
    });

    const uniPrice = priceData?.[uniAddress.toLowerCase()] || 0;

    // 6. Calculate Finals
    const formattedData = filteredTokens.map(token => {
        const balance = parseFloat(formatUnits(token.rawBalance, token.decimals));
        // DEXScreener returns keys in lowercase
        const price = priceData?.[token.address.toLowerCase()] || 0;
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
