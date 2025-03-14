import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { rootDir } from "./utils.js";
import { createMcpResponse } from "./get-token-info.js";
import dotenv from "dotenv";

dotenv.config({ path: path.join(rootDir, ".env") });

export async function listAccounts() {
  try {
    console.error("Starting listAccounts function");

    const keysFolder = path.resolve(rootDir, ".keys");
    console.error(`Using keys folder path: ${keysFolder}`);

    console.error(
      `Checking if keys folder exists: ${fs.existsSync(keysFolder)}`
    );
    if (!fs.existsSync(keysFolder)) {
      console.error(`Creating keys folder: ${keysFolder}`);
      try {
        fs.mkdirSync(keysFolder, { recursive: true });
        console.error(`Keys folder created successfully`);
        return {
          success: true,
          message: `No accounts found. Keys folder created at ${keysFolder}. Use the create-token or buy-token tools to create an account.`,
          accounts: [],
        };
      } catch (mkdirError: any) {
        console.error(`Error creating keys folder:`, mkdirError);
        return {
          success: false,
          error: `Error creating keys folder: ${
            mkdirError.message || JSON.stringify(mkdirError)
          }`,
          accounts: [],
        };
      }
    }

    console.error(`Reading files from keys folder: ${keysFolder}`);
    const files = fs.readdirSync(keysFolder);
    console.error(`Found ${files.length} files in keys folder`);

    const accounts = files
      .filter((file) => !file.startsWith("mint-") && file.endsWith(".json"))
      .map((file) => {
        const name = file.replace(".json", "");
        console.error(`Processing account file: ${file}`);
        try {
          const keypairData = JSON.parse(
            fs.readFileSync(path.join(keysFolder, file), "utf-8")
          );
          const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
          return { name, publicKey: keypair.publicKey.toString() };
        } catch (error: any) {
          console.error(`Error processing account file ${file}:`, error);
          return { name, publicKey: "Error reading keypair" };
        }
      });

    console.error(`Found ${accounts.length} accounts`);

    if (accounts.length === 0) {
      return {
        success: true,
        message: `No accounts found in ${keysFolder}. Use the create-token or buy-token tools to create an account.`,
        accounts: [],
      };
    }

    return {
      success: true,
      message: `Accounts in ${keysFolder}:`,
      accounts,
    };
  } catch (error: any) {
    console.error("Error listing accounts:", error);
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

    return { success: false, error: errorMessage, accounts: [] };
  }
}

export function formatListAccountsResult(
  result: ReturnType<typeof listAccounts> extends Promise<infer T> ? T : never
) {
  if (!result.success) {
    return `Error listing accounts: ${result.error}`;
  }

  if (result.accounts.length === 0) {
    return result.message;
  }

  const accountsText = result.accounts
    .map((account) => `${account.name}: ${account.publicKey}`)
    .join("\n");

  return `${result.message}\n\n${accountsText}`;
}

async function main() {
  try {
    const result = await listAccounts();

    console.log("\nResult:");
    const formattedResult = formatListAccountsResult(result);
    console.log(formattedResult);

    const mcpResponse = createMcpResponse(
      formattedResult || "Error: No result"
    );

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
  listAccounts,
  formatListAccountsResult,
};
