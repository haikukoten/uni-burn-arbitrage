import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    mainnet,
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import React from 'react';

import { http } from 'wagmi';
import { ALCHEMY_RPC_URL } from './config';

const config = getDefaultConfig({
    appName: 'UNI Burn Dashboard',
    projectId: 'YOUR_PROJECT_ID', // Placeholder, user would need a WC Cloud ID
    chains: [mainnet],
    transports: {
        [mainnet.id]: http(ALCHEMY_RPC_URL),
    },
    ssr: false,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
