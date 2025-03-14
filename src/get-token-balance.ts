import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { rootDir, getSPLBalance } from "./utils.js";
import dotenv from "dotenv";
import { initializeSDK } from "./get-token-info.js";

dotenv.config({ path: path.join(rootDir, ".env") });

export async function getAccountBalance(
  accountName: string = "default",
  tokenAddress?: string
): Promise<string> {
  try {
    const { connection } = initializeSDK();
    const keysFolder = path.resolve(rootDir, ".keys");
    const accountFilePath = path.join(keysFolder, `${accountName}.json`);

    if (!fs.existsSync(accountFilePath)) {
      throw new Error(`Account file not found for ${accountName}`);
    }

    const keypairData = JSON.parse(fs.readFileSync(accountFilePath, "utf-8"));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    const solBalance = await connection.getBalance(keypair.publicKey);

    let response = [
      `Account: ${accountName} (${keypair.publicKey.toString()})`,
      `SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`,
    ];

    if (tokenAddress) {
      const mintPublicKey = new PublicKey(tokenAddress);
      const tokenBalance = await getSPLBalance(
        connection,
        mintPublicKey,
        keypair.publicKey
      );

      response.push(
        `Token Balance (${tokenAddress}): ${
          tokenBalance !== null ? tokenBalance : "No token account found"
        }`
      );
    }

    return response.join("\n");
  } catch (error: any) {
    console.error("Error getting account balance:", error);
    return `Error getting account balance: ${
      error?.message || "Unknown error"
    }`;
  }
}

async function main() {
  const accountName = process.argv[2] || "default";
  const tokenAddress = process.argv[3];
  const result = await getAccountBalance(accountName, tokenAddress);
  console.log(result);
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
