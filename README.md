# pumpfun-mcp

A Model Context Protocol (MCP) server for interacting with the [Pump.fun](https://pump.fun) platform on Solana. This server enables AI assistants to create, buy, and sell tokens on the Pump.fun platform.

![Pump.fun MCP Demo](https://pump.fun/logo.png)

## Usage

To use this server with Claude or other MCP-compatible AI assistants, add the following configuration to your MCP client:

If you're on MacOS and want to run this in Claude Desktop, in your ~/Library/Application \Support/Claude/claude_desktop_config.json file, write the following:

```json
{
  "mcpServers": {
    "pumpfun": {
      "command": "node",
      "args": ["/Users/noahsolomon/Desktop/pumpfun-mcp/build/index.js"], // note this should be YOUR absolute path to index.js, not mine.
      "env": {
        "HELIUS_RPC_URL": "https://your-helius-rpc-url.com"
      }
    }
  }
}
```

Replace `https://your-helius-rpc-url.com` with your [Helius RPC URL](https://dev.helius.xyz/).

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/noahgsolomon/pumpfun-mcp.git
   cd pumpfun-mcp
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file with your Solana RPC URL:

   ```
   HELIUS_RPC_URL=https://your-helius-rpc-url.com
   ```

   You can get a free RPC URL from [Helius](https://dev.helius.xyz/).

   To use an existing Solana wallet, add your private key to the `.env` file:

   ```
   PRIVATE_KEY=your-base58-encoded-private-key
   ```

   Then run the conversion script to create a keypair file:

   ```
   node convert-key.js
   ```

   This will create a `default.json` file in the `.keys` folder with your keypair.

4. Build the project:

   ```
   npm run build
   ```

5. Run the MCP server:
   ```
   node build/index.js
   ```

## Components

### Tools

- **get-token-info**

  - Get information about a Pump.fun token
  - Input parameters:
    - `tokenAddress` (string, required): The token's mint address

- **create-token**

  - Create a new Pump.fun token
  - Input parameters:
    - `name` (string, required): Token name
    - `symbol` (string, required): Token symbol
    - `description` (string, required): Token description
    - `imageUrl` (string, optional): Path to local image file
    - `initialBuyAmount` (number, required): Initial buy amount in SOL (min 0.0001)
    - `accountName` (string, optional): Name of the account to use (defaults to "default")

- **buy-token**

  - Buy a Pump.fun token
  - Input parameters:
    - `tokenAddress` (string, required): The token's mint address
    - `buyAmount` (number, required): Amount to buy in SOL (min 0.0001)
    - `accountName` (string, optional): Name of the account to use (defaults to "default")
    - `slippageBasisPoints` (number, optional): Slippage tolerance in basis points (defaults to 100)

- **sell-token**

  - Sell a Pump.fun token
  - Input parameters:
    - `tokenAddress` (string, required): The token's mint address
    - `sellAmount` (number, required): Amount of tokens to sell (use 0 to sell all)
    - `accountName` (string, optional): Name of the account to use (defaults to "default")
    - `slippageBasisPoints` (number, optional): Slippage tolerance in basis points (defaults to 100)

- **list-accounts**

  - List all accounts in the keys folder
  - No input parameters required

- **get-account-balance**
  - Get the SOL and token balances for an account
  - Input parameters:
    - `accountName` (string, optional): Name of the account to check (defaults to "default")
    - `tokenAddress` (string, optional): Token address to check balance for

### Account Management

The MCP automatically creates and manages Solana keypairs in the `.keys` folder. Each keypair is stored as a JSON file with the account name as the filename.

When creating a token, the mint keypair is also saved in the `.keys` folder with the prefix `mint-`.

To use the MCP with your own account, you need to:

1. Add your private key to the `.env` file and run `node convert-key.js`
2. Have sufficient SOL in that wallet

## Standalone Scripts

The project includes several standalone scripts that can be run directly:

- **Get Token Info**: `node build/get-token-info.js <token_address>`
- **Create Token**: `node build/create-token.js <name> <symbol> <description> <initial_buy_amount> [account_name] [image_url]`
- **Buy Token**: `node build/buy-token.js <token_address> <buy_amount_sol> [account_name] [slippage_basis_points]`
- **Sell Token**: `node build/sell-token.js <token_address> <sell_amount> [account_name] [slippage_basis_points]`
- **List Accounts**: `node build/list-accounts.js`
- **Get Account Balance**: `node build/get-token-balance.js <account_name> [token_address]`

## Important Notes

- **Security**: The keypairs are stored unencrypted in the `.keys` folder. Make sure to secure this folder appropriately.
- **Fees**: All transactions on Solana require SOL for transaction fees. Make sure your accounts have enough SOL.
- **Slippage**: The default slippage tolerance is 1% (100 basis points). You can adjust this for each transaction.
- **Images**: When creating tokens with images, you must provide a local file path to the image. Remote URLs are not supported.

## Development

### Project Structure

- `src/index.ts`: Main MCP server entry point
- `src/get-token-info.ts`: Token information retrieval
- `src/create-token.ts`: Token creation functionality
- `src/buy-token.ts`: Token buying functionality
- `src/sell-token.ts`: Token selling functionality
- `src/list-accounts.ts`: Account listing functionality
- `src/get-token-balance.ts`: Account balance checking
- `src/utils.ts`: Shared utility functions
- `convert-key.js`: Utility to convert a base58 private key to a keypair JSON file

### Building

```
npm run build
```
