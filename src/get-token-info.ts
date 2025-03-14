import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "pumpdotfun-sdk";
import dotenv from "dotenv";
import path from "path";
import { rootDir, safeStringify } from "./utils.js";

dotenv.config({ path: path.join(rootDir, ".env") });

export function initializeSDK() {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) {
    throw new Error("HELIUS_RPC_URL environment variable is not set");
  }

  const connection = new Connection(rpcUrl);
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: new PublicKey("11111111111111111111111111111111"),
      signTransaction: async () => {
        throw new Error("Not implemented");
      },
      signAllTransactions: async () => {
        throw new Error("Not implemented");
      },
    },
    { commitment: "confirmed" }
  );

  return {
    sdk: new PumpFunSDK(provider),
    connection,
  };
}

export async function getTokenInfo(tokenAddress: string) {
  const { sdk } = initializeSDK();
  console.log("SDK initialized");

  const mintPublicKey = new PublicKey(tokenAddress);
  console.log("Getting bonding curve account...");
  const bondingCurveAccount = await sdk.getBondingCurveAccount(mintPublicKey);

  if (!bondingCurveAccount) {
    console.log(`No token found with address ${tokenAddress}`);
    return null;
  }

  const tokenTotalSupply = (bondingCurveAccount as any).tokenTotalSupply;
  const formattedSupply = tokenTotalSupply
    ? Number(tokenTotalSupply) / Math.pow(10, DEFAULT_DECIMALS)
    : "Unknown";

  return {
    tokenAddress,
    bondingCurveAccount,
    formattedSupply,
    pumpfunUrl: `https://pump.fun/${tokenAddress}`,
  };
}

export function formatTokenInfo(
  tokenInfo: ReturnType<typeof getTokenInfo> extends Promise<infer T>
    ? NonNullable<T>
    : never
) {
  return [
    `Token: ${tokenInfo.tokenAddress}`,
    `Supply: ${tokenInfo.formattedSupply}`,
    `Pump.fun URL: ${tokenInfo.pumpfunUrl}`,
  ].join("\n");
}

export function createMcpResponse(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

async function main() {
  const tokenAddress = process.argv[2];
  if (!tokenAddress) {
    console.error("Please provide a token address as a command line argument");
    process.exit(1);
  }

  console.log(`Checking token info for: ${tokenAddress}`);

  try {
    const tokenInfo = await getTokenInfo(tokenAddress);

    if (!tokenInfo) {
      return;
    }

    console.log("Raw account data:");
    console.log(safeStringify(tokenInfo.bondingCurveAccount));

    console.log("\nObject structure:");
    console.log("Type:", typeof tokenInfo.bondingCurveAccount);
    console.log(
      "Constructor:",
      tokenInfo.bondingCurveAccount.constructor?.name
    );
    console.log("Properties:", Object.keys(tokenInfo.bondingCurveAccount));

    console.log("\nProperty types:");
    for (const key of Object.keys(tokenInfo.bondingCurveAccount)) {
      const value = (tokenInfo.bondingCurveAccount as any)[key];
      console.log(`${key}: ${typeof value}`);
    }

    try {
      const { sdk } = initializeSDK();
      console.log("\nAttempting to get global account...");
      const globalAccount = await sdk.getGlobalAccount();
      console.log("Global account:", safeStringify(globalAccount));
    } catch (error) {
      console.log("Error getting global account:", error);
    }

    console.log("\nToken Information:");
    const formattedInfo = formatTokenInfo(tokenInfo);
    console.log(formattedInfo);

    const mcpResponse = createMcpResponse(formattedInfo);

    console.log("\nMCP Response (for reference):");
    console.log(JSON.stringify(mcpResponse, null, 2));
  } catch (error: any) {
    console.error("Error getting token info:", error);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export default {
  getTokenInfo,
  formatTokenInfo,
  createMcpResponse,
  initializeSDK,
  safeStringify,
};
