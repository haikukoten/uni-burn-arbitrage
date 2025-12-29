import React from 'react';
import { useArbitrageData } from '../hooks/useArbitrageData';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { FIREPIT_ADDRESS, FIREPIT_ABI } from '../config';
import { AlertTriangle, Flame, ArrowRight, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const { isConnected } = useAccount();
    const { tokens, totalJarValue, burnCost, netProfit, isLoading, uniPrice } = useArbitrageData();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isTxLoading } = useWaitForTransactionReceipt({ hash });

    const isProfitable = netProfit > 0;

    const handleRelease = () => {
        // Note: This requires the user to have approved the Firepit to spend 4000 UNI.
        const tokenAddresses = tokens.map(t => t.address as `0x${string}`);
        writeContract({
            address: FIREPIT_ADDRESS as `0x${string}`,
            abi: FIREPIT_ABI,
            functionName: 'release',
            args: [tokenAddresses]
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
                            <Flame className="text-orange-500" /> UNI Burn Arbitrage
                        </h1>
                        <p className="text-gray-400 mt-1">Monitor the TokenJar and burn UNI for profit.</p>
                    </div>
                    <ConnectButton />
                </div>

                {/* Main Status Card */}
                <div className={`p-8 rounded-2xl border ${isProfitable ? 'border-green-500/30 bg-green-950/20' : 'border-red-500/30 bg-red-950/20'} transition-all`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">

                        {/* Cost */}
                        <div className="space-y-2">
                            <p className="text-gray-400 text-sm uppercase tracking-wider">Cost to Burn (4k UNI)</p>
                            <p className="text-4xl font-mono font-bold text-red-400">
                                ${burnCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">@ ${uniPrice}/UNI</p>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center text-gray-600">
                            <ArrowRight size={48} />
                        </div>

                        {/* Value */}
                        <div className="space-y-2">
                            <p className="text-gray-400 text-sm uppercase tracking-wider">Jar Value</p>
                            <p className="text-4xl font-mono font-bold text-green-400">
                                ${totalJarValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">Across {tokens.length} tokens</p>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <div className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${isProfitable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            Net Profit: ${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>

                {/* Warnings */}
                <div className="bg-yellow-950/30 border border-yellow-700/50 p-6 rounded-xl flex gap-4 items-start">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-yellow-500 font-bold text-lg">Requirements</h3>
                        <ul className="list-disc list-inside text-yellow-200/80 space-y-1 mt-2">
                            <li>You must own at least <strong>4,000 UNI</strong>.</li>
                            <li>You must <strong>approve</strong> the Firepit contract to spend your UNI.</li>
                            <li>The transaction will <strong>permanently burn</strong> your UNI tokens.</li>
                        </ul>
                    </div>
                </div>

                {/* Token List */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="container px-6 py-4 border-b border-gray-800 font-semibold text-gray-400">
                        Token Breakdown
                    </div>
                    <div className="divide-y divide-gray-800">
                        {tokens.map((token) => (
                            <div key={token.symbol} className="px-6 py-4 flex justify-between items-center hover:bg-gray-800/50 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                                        {token.symbol[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold">{token.symbol}</div>
                                        <div className="text-xs text-gray-500">{token.address.slice(0, 6)}...{token.address.slice(-4)}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                                    <div className="text-sm text-gray-500">
                                        {token.price > 0 ? `$${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Price Error'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex flex-col items-center gap-4">
                    {!isConnected ? (
                        <div className="text-gray-400">Connect your wallet to execute</div>
                    ) : (
                        <button
                            onClick={handleRelease}
                            disabled={!isProfitable || isPending || isTxLoading}
                            className={`
                px-8 py-4 rounded-xl text-xl font-bold shadow-lg transform transition active:scale-95
                ${!isProfitable
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:brightness-110 shadow-orange-900/50'
                                }
              `}
                        >
                            {isPending || isTxLoading ? 'Executing...' : '🔥 Burn 4000 UNI & Claim'}
                        </button>
                    )}
                    {hash && (
                        <a
                            href={`https://etherscan.io/tx/${hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline text-sm"
                        >
                            View Transaction: {hash.slice(0, 10)}...
                        </a>
                    )}
                </div>

            </div>
        </div>
    );
};
