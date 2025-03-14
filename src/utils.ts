import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function getKeysFolder() {
  try {
    const folder = process.env.KEYS_FOLDER || path.resolve(rootDir, ".keys");

    const parentDir = path.dirname(folder);
    if (fs.existsSync(parentDir)) {
      try {
        fs.accessSync(parentDir, fs.constants.W_OK);
      } catch (accessError) {
        console.error(`Parent directory is not writable:`, accessError);
      }
    }

    return folder;
  } catch (error) {
    console.error("Error in getKeysFolder:", error);
    throw error;
  }
}

function getOrCreateKeypair(keysFolder: string, name: string): Keypair {
  const keypairPath = path.join(keysFolder, `${name}.json`);

  try {
    if (!fs.existsSync(keysFolder)) {
      fs.mkdirSync(keysFolder, { recursive: true });
    }

    if (fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } else {
      const keypair = Keypair.generate();
      fs.writeFileSync(
        keypairPath,
        JSON.stringify(Array.from(keypair.secretKey))
      );
      return keypair;
    }
  } catch (error) {
    console.error(`Error with keypair ${name}:`, error);
    throw error;
  }
}

async function getSPLBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<number | null> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      owner,
      {
        mint,
      }
    );

    if (tokenAccounts.value.length === 0) {
      return null;
    }

    const tokenAccount = tokenAccounts.value[0];
    const parsedInfo = tokenAccount.account.data.parsed.info;
    const balance = parsedInfo.tokenAmount.uiAmount;

    return balance;
  } catch (error) {
    console.error("Error getting SPL balance:", error);
    return null;
  }
}

async function printSOLBalance(
  connection: Connection,
  publicKey: PublicKey,
  label: string = "Account"
): Promise<void> {
  try {
    const balance = await connection.getBalance(publicKey);
    console.log(`${label} SOL Balance:`, balance / LAMPORTS_PER_SOL);
  } catch (error) {
    console.error("Error printing SOL balance:", error);
  }
}

async function printSPLBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  label: string = "SPL Token"
): Promise<void> {
  try {
    const balance = await getSPLBalance(connection, mint, owner);
    console.log(
      `${label} Balance:`,
      balance !== null ? balance : "No token account found"
    );
  } catch (error) {
    console.error("Error printing SPL balance:", error);
  }
}

const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

export {
  __filename,
  __dirname,
  rootDir,
  getKeysFolder,
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
  safeStringify,
};
