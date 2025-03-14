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

export async function sellToken(
  tokenAddress: string,
  sellAmount: number = 0,
  accountName: string = "default",
  slippageBasisPoints: number = 100
) {
  try {
    console.error("Starting sellToken function");
    const { sdk, connection } = initializeSDK();
    console.error("SDK initialized");

    const keysFolder = path.resolve(rootDir, ".keys");
    console.error(`Using keys folder path relative to script: ${keysFolder}`);

    console.error(
      `Checking if keys folder exists: ${fs.existsSync(keysFolder)}`
    );
    if (!fs.existsSync(keysFolder)) {
      console.error(`Creating keys folder: ${keysFolder}`);
      try {
        fs.mkdirSync(keysFolder, { recursive: true });
        console.error(`Keys folder created successfully`);
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

    console.error(`Getting or creating keypair from folder: ${keysFolder}`);
    const account = getOrCreateKeypair(keysFolder, accountName);
    console.log(`Using account: ${account.publicKey.toString()}`);

    const mintPublicKey = new PublicKey(tokenAddress);
    console.log(`Token address: ${tokenAddress}`);

    const tokenBalance = await getSPLBalance(
      connection,
      mintPublicKey,
      account.publicKey
    );
    console.log(`Current token balance: ${tokenBalance}`);

    if (!tokenBalance || tokenBalance === 0) {
      const errorMessage = `No tokens to sell. Account ${account.publicKey.toString()} has 0 tokens of ${tokenAddress}.`;
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    const amountToSell =
      sellAmount === 0 ? tokenBalance : Math.min(sellAmount, tokenBalance);
    console.log(`Amount to sell: ${amountToSell}`);

    const initialSolBalance = await connection.getBalance(account.publicKey);
    console.log(
      `Initial SOL balance: ${initialSolBalance / LAMPORTS_PER_SOL} SOL`
    );

    console.log(`Selling ${amountToSell} tokens...`);
    const result = await sdk.sell(
      account,
      mintPublicKey,
      BigInt(amountToSell * Math.pow(10, 6)),
      BigInt(slippageBasisPoints),
      DEFAULT_PRIORITY_FEES
    );

    if (!result.success) {
      console.error(`Failed to sell token:`, result.error);
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
    const newSolBalance = await connection.getBalance(account.publicKey);
    console.log(`New SOL balance: ${newSolBalance / LAMPORTS_PER_SOL} SOL`);

    const solReceived = (newSolBalance - initialSolBalance) / LAMPORTS_PER_SOL;
    console.log(`SOL received: ${solReceived} SOL`);

    const newTokenBalance =
      (await getSPLBalance(connection, mintPublicKey, account.publicKey)) || 0;
    console.log(`New token balance: ${newTokenBalance}`);

    return {
      success: true,
      tokenAddress,
      tokensSold: amountToSell,
      solReceived,
      newTokenBalance,
      signature: result.signature,
      pumpfunUrl: `https://pump.fun/${tokenAddress}`,
    };
  } catch (error: any) {
    console.error("Error selling token:", error);
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

export function formatSellResult(
  result: ReturnType<typeof sellToken> extends Promise<infer T> ? T : never
) {
  if (!result.success) {
    return `Error selling token: ${result.error}`;
  }

  return [
    `Successfully sold token!`,
    `Token Address: ${result.tokenAddress}`,
    `Tokens Sold: ${result.tokensSold}`,
    `SOL Received: ${result.solReceived} SOL`,
    `Remaining Token Balance: ${result.newTokenBalance}`,
    `Transaction Signature: ${result.signature}`,
    `Pump.fun URL: ${result.pumpfunUrl}`,
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "Usage: node sell-token.js <token_address> [sell_amount] [account_name] [slippage_basis_points]"
    );
    console.error(
      "Example: node sell-token.js G5e2XonmccmdKc98g3eNQe5oBYGw9m8xdMUvVtcZpump 1000 default 100"
    );
    console.error(
      "Note: If sell_amount is 0 or not provided, all tokens will be sold."
    );
    process.exit(1);
  }

  const tokenAddress = args[0];
  const sellAmount = args[1] ? parseFloat(args[1]) : 0;
  const accountName = args[2] || "default";
  const slippageBasisPoints = args[3] ? parseInt(args[3]) : 100;

  if (isNaN(sellAmount) || sellAmount < 0) {
    console.error("Sell amount must be a non-negative number");
    process.exit(1);
  }

  if (isNaN(slippageBasisPoints) || slippageBasisPoints < 0) {
    console.error("Slippage basis points must be a non-negative integer");
    process.exit(1);
  }

  const sellAmountText = sellAmount === 0 ? "ALL" : sellAmount;
  console.log(
    `Selling ${sellAmountText} tokens of ${tokenAddress} with account ${accountName} and slippage ${slippageBasisPoints} basis points`
  );

  try {
    const result = await sellToken(
      tokenAddress,
      sellAmount,
      accountName,
      slippageBasisPoints
    );

    console.log("\nResult:");
    const formattedResult = formatSellResult(result);
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
  sellToken,
  formatSellResult,
};
