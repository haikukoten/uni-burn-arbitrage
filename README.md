-# UNI Burn Arbitrage Dashboard 🔥

A specialized interface for monitoring and executing the **Uniswap Firepit Arbitrage** opportunity.
This tool tracks the accumulated fees in the Uniswap "TokenJar" contract and calculates the profitability of burning **4,000 UNI** tokens to release them.

## ⚠️ CRITICAL WARNING ⚠️

> **READ THIS BEFORE USING**
>
> 1.  **Irreversible Action**: Executing the `release()` function via this dashboard will **PERMANENTLY BURN 4,000 UNI** from your connected wallet. This is approximately **$25,000+ USD** at current prices. **YOU CANNOT UNDO THIS.**
> 2.  **Financial Risk**: Ensure the value of tokens in the Jar is **GREATER** than the cost of 4,000 UNI + Gas Fees.
> 3.  **Competition**: This is a public arbitrage opportunity. Front-running bots may claim the jar before your transaction confirms.
> 4.  **No Warranty**: This software is provided "AS IS" without warranty of any kind. Use at your own risk.

## How It Works

The **Uniswap Firepit** contract allows anyone to trigger a `release(address[] tokens)` function.
-   **Condition**: The caller must burn **4,000 UNI**.
-   **Reward**: The contract transfers all held balances of the specified tokens from the **TokenJar** to the caller.

This dashboard:
1.  **Monitors** the real-time balances of the TokenJar (`0xf385...95f85`).
2.  **Fetches** live prices via CoinGecko API.
3.  **Compares** the Total Jar Value vs. Cost of 4,000 UNI.
4.  **Executes** the burn transaction if approved by the user.

## Tech Stack

-   **Frontend**: React (Vite)
-   **Web3**: Wagmi v2, Viem, RainbowKit
-   **Data**: CoinGecko API (Prices), On-chain RPC (Balances)
-   **Styling**: Tailwind CSS

## Usage

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Locally**:
    ```bash
    npm run dev
    ```
3.  **Build**:
    ```bash
    npm run build
    ```

## Contracts

-   **Firepit**: `0x0D5Cd355e2aBEB8fb1552F56c965B867346d6721`
-   **TokenJar**: `0xf38521f130fccf29db1961597bc5d2b60f995f85`

---
*Built for educational purposes. Exercise extreme caution when interacting with mainnet smart contracts.*
