import { WagmiProvider, createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";

const config = createConfig({
  chains: [hardhat],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
