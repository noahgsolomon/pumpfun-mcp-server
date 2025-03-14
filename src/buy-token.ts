import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { initializeSDK, createMcpResponse } from "./get-token-info.js";
import { getOrCreateKeypair, getSPLBalance, rootDir } from "./utils.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(rootDir, ".env") });

const DEFAULT_PRIORITY_FEES = {
  unitLimit: 250000,
  unitPrice: 250000,
};

export async function buyToken(
  tokenAddress: string,
  buyAmount: number,
  accountName: string = "default",
  slippageBasisPoints: number = 100
) {
  try {
    const { sdk, connection } = initializeSDK();

    const keysFolder = path.resolve(rootDir, ".keys");

    if (!fs.existsSync(keysFolder)) {
      try {
        fs.mkdirSync(keysFolder, { recursive: true });
      } catch (mkdirError: any) {
        console.error(`Error creating keys folder:`, mkdirError);
        return {
          success: false,
          error: `Error creating keys folder: ${
            mkdirError.message || JSON.stringify(mkdirError)
          }`,
        };
      }
    }

    const account = getOrCreateKeypair(keysFolder, accountName);
    console.log(`Using account: ${account.publicKey.toString()}`);

    const balance = await connection.getBalance(account.publicKey);
    console.log(`Account balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    const requiredBalance =
      buyAmount * LAMPORTS_PER_SOL + 0.001 * LAMPORTS_PER_SOL;
    console.log(`Required balance: ${requiredBalance / LAMPORTS_PER_SOL} SOL`);

    if (balance < requiredBalance) {
      const errorMessage = `Insufficient SOL balance. Account ${account.publicKey.toString()} has ${
        balance / LAMPORTS_PER_SOL
      } SOL, but needs at least ${
        requiredBalance / LAMPORTS_PER_SOL
      } SOL. Please send SOL to this address and try again.`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    const mintPublicKey = new PublicKey(tokenAddress);
    console.log(`Token address: ${tokenAddress}`);

    const initialTokenBalance =
      (await getSPLBalance(connection, mintPublicKey, account.publicKey)) || 0;
    console.log(`Initial token balance: ${initialTokenBalance}`);

    console.log(`Buying ${buyAmount} SOL worth of tokens...`);
    const result = await sdk.buy(
      account,
      mintPublicKey,
      BigInt(buyAmount * LAMPORTS_PER_SOL),
      BigInt(slippageBasisPoints),
      DEFAULT_PRIORITY_FEES
    );

    if (!result.success) {
      console.error(`Failed to buy token:`, result.error);
      return {
        success: false,
        error: result.error
          ? typeof result.error === "object"
            ? JSON.stringify(result.error)
            : result.error
          : "Unknown error",
      };
    }

    console.log(`Transaction successful: ${result.signature}`);
    const newTokenBalance =
      (await getSPLBalance(connection, mintPublicKey, account.publicKey)) || 0;
    console.log(`New token balance: ${newTokenBalance}`);

    const tokensPurchased = newTokenBalance - initialTokenBalance;
    console.log(`Tokens purchased: ${tokensPurchased}`);

    return {
      success: true,
      tokenAddress,
      amountSpent: buyAmount,
      tokensPurchased,
      newBalance: newTokenBalance,
      signature: result.signature,
      pumpfunUrl: `https://pump.fun/${tokenAddress}`,
    };
  } catch (error: any) {
    console.error("Error buying token:", error);
    console.error("Error stack:", error.stack);

    let errorMessage = "Unknown error";
    if (error) {
      if (typeof error === "object") {
        if (error.message) {
          errorMessage = error.message;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = "Error object could not be stringified";
          }
        }
      } else {
        errorMessage = String(error);
      }
    }

    return { success: false, error: errorMessage };
  }
}

export function formatBuyResult(
  result: ReturnType<typeof buyToken> extends Promise<infer T> ? T : never
) {
  if (!result.success) {
    return `Error buying token: ${result.error}`;
  }

  return [
    `Successfully bought token!`,
    `Token Address: ${result.tokenAddress}`,
    `Amount Spent: ${result.amountSpent} SOL`,
    `Tokens Purchased: ${result.tokensPurchased}`,
    `New Balance: ${result.newBalance}`,
    `Transaction Signature: ${result.signature}`,
    `Pump.fun URL: ${result.pumpfunUrl}`,
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node buy-token.js <token_address> <buy_amount_sol> [account_name] [slippage_basis_points]"
    );
    console.error(
      "Example: node buy-token.js G5e2XonmccmdKc98g3eNQe5oBYGw9m8xdMUvVtcZpump 0.1 default 100"
    );
    process.exit(1);
  }

  const tokenAddress = args[0];
  const buyAmount = parseFloat(args[1]);
  const accountName = args[2] || "default";
  const slippageBasisPoints = args[3] ? parseInt(args[3]) : 100;

  if (isNaN(buyAmount) || buyAmount < 0.0001) {
    console.error(
      "Buy amount must be a number greater than or equal to 0.0001"
    );
    process.exit(1);
  }

  if (isNaN(slippageBasisPoints) || slippageBasisPoints < 0) {
    console.error("Slippage basis points must be a non-negative integer");
    process.exit(1);
  }

  console.log(
    `Buying ${buyAmount} SOL worth of token ${tokenAddress} with account ${accountName} and slippage ${slippageBasisPoints} basis points`
  );

  try {
    const result = await buyToken(
      tokenAddress,
      buyAmount,
      accountName,
      slippageBasisPoints
    );

    console.log("\nResult:");
    const formattedResult = formatBuyResult(result);
    console.log(formattedResult);

    const mcpResponse = createMcpResponse(formattedResult);

    console.log("\nMCP Response (for reference):");
    console.log(JSON.stringify(mcpResponse, null, 2));
  } catch (error: any) {
    console.error("Error in main:", error);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export default {
  buyToken,
  formatBuyResult,
};
