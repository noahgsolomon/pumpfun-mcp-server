import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-sdk";
import path from "path";
import dotenv from "dotenv";
import { rootDir } from "./utils.js";
import {
  getTokenInfo,
  formatTokenInfo,
  createMcpResponse,
} from "./get-token-info.js";
import { buyToken, formatBuyResult } from "./buy-token.js";
import { sellToken, formatSellResult } from "./sell-token.js";
import { listAccounts, formatListAccountsResult } from "./list-accounts.js";
import { getAccountBalance } from "./get-token-balance.js";
import { createToken, formatCreateTokenResult } from "./create-token.js";

dotenv.config({ path: path.join(rootDir, ".env") });

const server = new McpServer({
  name: "pumpfun",
  version: "1.0.0",
});

function getProvider() {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) {
    throw new Error("HELIUS_RPC_URL environment variable is not set");
  }

  const connection = new Connection(rpcUrl);
  const wallet = new Keypair();
  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: async () => {
        throw new Error("Not implemented");
      },
      signAllTransactions: async () => {
        throw new Error("Not implemented");
      },
    },
    { commitment: "confirmed" }
  );
}

function getSDK() {
  const provider = getProvider();
  return new PumpFunSDK(provider);
}

server.tool(
  "get-token-info",
  "Get information about a Pump.fun token",
  {
    tokenAddress: z.string().describe("The token's mint address"),
  },
  async ({ tokenAddress }, extra) => {
    try {
      console.error(`Checking token info for: ${tokenAddress}`);

      const tokenInfo = await getTokenInfo(tokenAddress);

      if (!tokenInfo) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No token found with address ${tokenAddress}`,
            },
          ],
        };
      }

      const formattedInfo = formatTokenInfo(tokenInfo);

      return createMcpResponse(formattedInfo);
    } catch (error: any) {
      console.error("Error getting token info:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error getting token info: ${
              error?.message || "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

server.tool(
  "create-token",
  "Create a new Pump.fun token",
  {
    name: z.string().describe("Token name"),
    symbol: z.string().describe("Token symbol"),
    description: z.string().describe("Token description"),
    imageUrl: z.string().optional().describe("URL to token image (optional)"),
    initialBuyAmount: z
      .number()
      .min(0.0001)
      .describe("Initial buy amount in SOL"),
    accountName: z
      .string()
      .default("default")
      .describe(
        "Name of the account to use (will be created if it doesn't exist)"
      ),
  },
  async ({
    name,
    symbol,
    description,
    imageUrl,
    initialBuyAmount,
    accountName,
  }) => {
    try {
      const result = await createToken(
        name,
        symbol,
        description,
        imageUrl,
        initialBuyAmount,
        accountName
      );

      const formattedResult = formatCreateTokenResult(result);

      return createMcpResponse(formattedResult);
    } catch (error: any) {
      console.error("Error creating token:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating token: ${error?.message || "Unknown error"}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "buy-token",
  "Buy a Pump.fun token",
  {
    tokenAddress: z.string().describe("The token's mint address"),
    buyAmount: z.number().min(0.0001).describe("Amount to buy in SOL"),
    accountName: z
      .string()
      .default("default")
      .describe("Name of the account to use"),
    slippageBasisPoints: z
      .number()
      .default(100)
      .describe("Slippage tolerance in basis points (1% = 100)"),
  },
  async ({ tokenAddress, buyAmount, accountName, slippageBasisPoints }) => {
    try {
      console.error(`Buying token: ${tokenAddress}, amount: ${buyAmount} SOL`);

      const result = await buyToken(
        tokenAddress,
        buyAmount,
        accountName,
        slippageBasisPoints
      );

      const formattedResult = formatBuyResult(result);

      return createMcpResponse(formattedResult);
    } catch (error: any) {
      console.error("Error buying token:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error buying token: ${error?.message || "Unknown error"}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "sell-token",
  "Sell a Pump.fun token",
  {
    tokenAddress: z.string().describe("The token's mint address"),
    sellAmount: z
      .number()
      .min(0)
      .describe("Amount of tokens to sell (0 for all)"),
    accountName: z
      .string()
      .default("default")
      .describe("Name of the account to use"),
    slippageBasisPoints: z
      .number()
      .default(100)
      .describe("Slippage tolerance in basis points (1% = 100)"),
  },
  async ({ tokenAddress, sellAmount, accountName, slippageBasisPoints }) => {
    try {
      console.error(
        `Selling token: ${tokenAddress}, amount: ${
          sellAmount === 0 ? "ALL" : sellAmount
        }`
      );

      const result = await sellToken(
        tokenAddress,
        sellAmount,
        accountName,
        slippageBasisPoints
      );

      const formattedResult = formatSellResult(result);

      return createMcpResponse(formattedResult);
    } catch (error: any) {
      console.error("Error selling token:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error selling token: ${error?.message || "Unknown error"}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "list-accounts",
  "List all accounts in the keys folder",
  {},
  async () => {
    try {
      console.error("Listing accounts");

      const result = await listAccounts();
      const formattedResult = formatListAccountsResult(result);

      return createMcpResponse(
        formattedResult || "Error: No account information available"
      );
    } catch (error: any) {
      console.error("Error listing accounts:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing accounts: ${
              error?.message || "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

server.tool(
  "get-account-balance",
  "Get the SOL and token balances for an account",
  {
    accountName: z
      .string()
      .default("default")
      .describe("Name of the account to check"),
    tokenAddress: z
      .string()
      .optional()
      .describe("Optional token address to check balance for"),
  },
  async ({ accountName, tokenAddress }) => {
    try {
      const result = await getAccountBalance(accountName, tokenAddress);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error: any) {
      console.error("Error getting account balance:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting account balance: ${
              error?.message || "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pump Fun MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
