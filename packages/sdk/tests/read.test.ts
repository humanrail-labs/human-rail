import { Connection, PublicKey } from "@solana/web3.js";
import { HumanRailClient, parseHumanProfile } from "../src/index.js";

async function main() {
  const rpcUrl = "https://api.devnet.solana.com";
  const client = new HumanRailClient({ rpcUrl });
  const connection = new Connection(rpcUrl, "confirmed");

  // Try to find any human profiles on devnet by scanning program accounts
  console.log("Scanning HumanRail devnet state...\n");

  // Find all human profiles
  const humanAccounts = await connection.getProgramAccounts(
    new PublicKey("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo")
  );
  console.log(`Found ${humanAccounts.length} human registry accounts`);

  let profilesFound = 0;
  for (const { pubkey, account } of humanAccounts.slice(0, 10)) {
    const profile = parseHumanProfile(account.data as Buffer);
    if (profile) {
      profilesFound++;
      console.log(`\nProfile ${profilesFound}: ${pubkey.toBase58()}`);
      console.log(`  Wallet: ${profile.wallet.toBase58()}`);
      console.log(`  Human Score: ${profile.humanScore}`);
      console.log(`  Can Register Agents: ${profile.canRegisterAgents}`);
      console.log(`  Agents Registered: ${profile.agentsRegistered}`);

      // Also verify getHumanProfile works
      const byWallet = await client.getHumanProfile(profile.wallet);
      console.log(`  getHumanProfile() match: ${byWallet !== null}`);

      // Try fetching agents for this principal
      const agents = await client.getAgentsByPrincipal(profile.wallet);
      console.log(`  Agents: ${agents.length}`);
      for (const agent of agents) {
        console.log(`    - ${agent.name} (${agent.status}) PDA: ${agent.pda.toBase58()}`);
        const capabilities = await client.getCapabilitiesForAgent(profile.wallet, agent.pda);
        console.log(`      Capabilities: ${capabilities.length}`);
        for (const cap of capabilities) {
          console.log(`        - ${cap.status} | perTx: ${cap.perTxLimit} | daily: ${cap.dailyLimit} | total: ${cap.totalLimit} | frozen: ${cap.isFrozen}`);
        }
        const receipts = await client.getReceipts(agent.pda, 3);
        console.log(`      Receipts (last 3): ${receipts.length}`);
      }
    }
  }

  if (profilesFound === 0) {
    console.log("No human profiles found on devnet. Use the Agent Vault frontend to create a test profile and agent first.");
  }

  // Find all agents
  const agentAccounts = await connection.getProgramAccounts(
    new PublicKey("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ")
  );
  console.log(`\nTotal agent registry accounts: ${agentAccounts.length}`);

  // Find all capabilities
  const capAccounts = await connection.getProgramAccounts(
    new PublicKey("DiNpgESa1iYxKkqmpCu8ULaXEmhqvD33ADGaaH3qP7XT")
  );
  console.log(`Total capability accounts: ${capAccounts.length}`);

  // Find all receipts
  const receiptAccounts = await connection.getProgramAccounts(
    new PublicKey("EFjLqSdPv45PmdhUwaFGRwCfENo58fRCtwTvqnQd8ZwM")
  );
  console.log(`Total receipt accounts: ${receiptAccounts.length}`);
}

main().catch(console.error);
