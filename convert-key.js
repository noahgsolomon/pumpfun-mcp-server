import bs58 from "bs58";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const privateKeyBase58 = process.env.PRIVATE_KEY;

const privateKeyBytes = bs58.decode(privateKeyBase58);

const privateKeyArray = Array.from(privateKeyBytes);

const keysFolder = "./.keys";
if (!fs.existsSync(keysFolder)) {
  fs.mkdirSync(keysFolder, { recursive: true });
}

fs.writeFileSync(`${keysFolder}/default.json`, JSON.stringify(privateKeyArray));

console.log(`Private key successfully written to ${keysFolder}/default.json`);
