// Import Bridge Kit and its dependencies
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import dotenv from "dotenv";
import { inspect } from "util";
dotenv.config();

// Initialize the SDK
const kit = new BridgeKit();

const bridgeUSDC = async (): Promise<void> => {
  try {
    // Initialize the adapter which lets you transfer tokens from your wallet on any EVM-compatible chain
    const adapter = createViemAdapterFromPrivateKey({
      privateKey: process.env.PRIVATE_KEY as string,
    });

    console.log("---------------Starting Bridging---------------");

    // Use the same adapter for the source and destination blockchains
    const result = await kit.bridge({
      from: { adapter, chain: "Base_Sepolia" },
      to: { adapter, chain: "Arbitrum_Sepolia" },
      amount: "1.00",
    });

    console.log("RESULT", inspect(result, false, null, true));
  } catch (err) {
    console.log("ERROR", inspect(err, false, null, true));
  }
};

void bridgeUSDC();