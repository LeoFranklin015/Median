import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";

const PRIVATE_KEY = "0xf147fe4cc26c756572b13cf7a306c900c68248cd898b5534690cac702c9a90ba";

async function main() {
    console.log("CCTP Bridge: 1 USDC from Sepolia -> Arbitrum Sepolia");

    const kit = new BridgeKit();

    const adapter = createViemAdapterFromPrivateKey({
        privateKey: PRIVATE_KEY,
    });

    console.log("Starting bridge...");

    const result = await kit.bridge({
        from: { adapter, chain: "Ethereum_Sepolia" as any },
        to: { adapter, chain: "Arbitrum_Sepolia" as any },
        amount: "1",
    });

    console.log("Bridge complete!");
    console.log("Result:", JSON.stringify(result, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
}

main().catch((err) => {
    console.error("Bridge failed:", err);
    process.exit(1);
});
