import { Keypair, PublicKey, Connection, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { HumanRailClient, HumanRailAgent, HumanRailPrincipal } from "../src/index.js";
import { buildRegisterHumanIx } from "../src/instructions.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Known devnet agent from read test
const KNOWN_PRINCIPAL = new PublicKey("HYUZJyhULEQZwnvLL3y1oVAJSvisTqof82vTusfK8sXf");
const KNOWN_AGENT = new PublicKey("CoPwqRxwuLgLoz5K621wDEj6HDq7RGUMff8b3zVyQVHe");

async function main() {
  const rpcUrl = "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const client = new HumanRailClient({ rpcUrl });

  console.log("=== SDK Write Test ===\n");

  // 1. Test agent class reads against known devnet account
  console.log("1. Testing HumanRailAgent reads...");
  const dummyAgentKeypair = Keypair.generate(); // we don't need the real keypair for reads
  const agent = new HumanRailAgent({
    agentKeypair: { publicKey: KNOWN_AGENT } as any,
    principalPubkey: KNOWN_PRINCIPAL,
    rpcUrl,
  });

  const check = await agent.checkCapability({ action: "Payment", amount: BigInt(0.01e9) });
  console.log("   Capability check:", check.authorized, check.reason || "");

  const frozen = await agent.isFrozen();
  console.log("   Is frozen:", frozen);

  const active = await agent.isActive();
  console.log("   Is active:", active);

  // 2. Test Principal transaction builders (simulate)
  console.log("\n2. Testing Principal transaction builders (simulation)...");
  const principal = new HumanRailPrincipal({ walletPubkey: KNOWN_PRINCIPAL, rpcUrl });

  const registerAgentTx = await principal.buildRegisterAgentTx({
    agentPubkey: dummyAgentKeypair.publicKey,
    name: "sim-agent",
    agentType: "Test",
  });
  console.log("   RegisterAgent tx accounts:", registerAgentTx.instructions[0].keys.length);

  const issueCapTx = await principal.buildIssueCapabilityTx({
    agentPubkey: KNOWN_AGENT,
    scope: "Payment",
    perTxLimit: BigInt(0.1e9),
    dailyLimit: BigInt(0.5e9),
    totalLimit: BigInt(1e9),
    expiresAt: null,
  });
  console.log("   IssueCapability tx accounts:", issueCapTx.instructions[0].keys.length);

  // Simulate these txs (they will likely fail because principal isn't signer in sim, but structure is valid)
  try {
    const sim = await connection.simulateTransaction(issueCapTx);
    console.log("   Simulation result:", sim.value.err ? "Error (expected)" : "Success");
  } catch (e: any) {
    console.log("   Simulation skipped:", e.message);
  }

  // 3. If TEST_WALLET_SECRET is provided, do real transactions
  const testSecret = process.env.TEST_WALLET_SECRET;
  if (testSecret) {
    console.log("\n3. Running live transaction test with provided wallet...");
    const testKeypair = Keypair.fromSecretKey(bs58.decode(testSecret));
    console.log("   Test wallet:", testKeypair.publicKey.toBase58());

    const balance = await connection.getBalance(testKeypair.publicKey);
    console.log("   Balance:", balance / 1e9, "SOL");

    if (balance < 0.1e9) {
      console.log("   Insufficient balance for live test.");
      return;
    }

    const livePrincipal = new HumanRailPrincipal({ walletPubkey: testKeypair.publicKey, rpcUrl });
    const liveAgentKeypair = Keypair.generate();

    // Register human profile if not exists
    const profile = await client.getHumanProfile(testKeypair.publicKey);
    if (!profile) {
      console.log("   Registering human profile...");
      const tx = new Transaction().add(
        buildRegisterHumanIx({ wallet: testKeypair.publicKey, displayName: "SDK Test" })
      );
      const rb = await connection.getLatestBlockhash();
      tx.recentBlockhash = rb.blockhash;
      tx.feePayer = testKeypair.publicKey;
      tx.sign(testKeypair);
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction({ signature: sig, ...rb }, "confirmed");
      console.log("   Profile registered:", sig);
      await sleep(1000);
    }

    // Register agent
    console.log("   Registering agent...");
    const registerTx = await livePrincipal.buildRegisterAgentTx({
      agentPubkey: liveAgentKeypair.publicKey,
      name: "live-test",
      agentType: "Test",
    });
    const rb = await connection.getLatestBlockhash();
    registerTx.recentBlockhash = rb.blockhash;
    registerTx.feePayer = testKeypair.publicKey;
    registerTx.sign(testKeypair);
    const agentSig = await connection.sendRawTransaction(registerTx.serialize());
    await connection.confirmTransaction({ signature: agentSig, ...rb }, "confirmed");
    console.log("   Agent registered:", agentSig);
    await sleep(1000);

    // Issue capability
    console.log("   Issuing capability...");
    const capTx = await livePrincipal.buildIssueCapabilityTx({
      agentPubkey: liveAgentKeypair.publicKey,
      scope: "Payment",
      perTxLimit: BigInt(0.05e9),
      dailyLimit: BigInt(0.1e9),
      totalLimit: BigInt(0.2e9),
      expiresAt: null,
    });
    const cb = await connection.getLatestBlockhash();
    capTx.recentBlockhash = cb.blockhash;
    capTx.feePayer = testKeypair.publicKey;
    capTx.sign(testKeypair);
    const capSig = await connection.sendRawTransaction(capTx.serialize());
    await connection.confirmTransaction({ signature: capSig, ...cb }, "confirmed");
    console.log("   Capability issued:", capSig);
    await sleep(1000);

    // Agent payment
    console.log("   Executing agent payment...");
    const liveAgent = new HumanRailAgent({
      agentKeypair: liveAgentKeypair,
      principalPubkey: testKeypair.publicKey,
      rpcUrl,
    });
    const recipient = Keypair.generate().publicKey;
    const result = await liveAgent.executePayment({
      to: recipient,
      amount: BigInt(0.01e9),
      memo: "Live SDK test payment",
    });
    console.log("   Payment success:", result.success, result.signatures);
  } else {
    console.log("\n3. Skipping live transactions (set TEST_WALLET_SECRET env var to run).");
  }

  console.log("\n✅ Write test completed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
