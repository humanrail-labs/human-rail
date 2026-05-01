import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import os from 'os';
import { keccak_256 } from '@noble/hashes/sha3.js';

const IKA_DWALLET_PROGRAM_ID_DEVNET = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
const RPC = 'https://api.devnet.solana.com';

function loadKeypair(): Keypair {
  const path = process.env.KEYPAIR_PATH || os.homedir() + '/.config/solana/id.json';
  const secret = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secret));
}

async function main() {
  const payer = loadKeypair();
  const connection = new Connection(RPC, 'confirmed');
  
  const dwalletPda = new PublicKey('A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp');
  const coordinatorPda = PublicKey.findProgramAddressSync([Buffer.from('dwallet_coordinator')], IKA_DWALLET_PROGRAM_ID_DEVNET)[0];
  const cpiAuthority = PublicKey.findProgramAddressSync([Buffer.from('__ika_cpi_authority')], payer.publicKey)[0];
  
  // Fetch dWallet data
  const info = await connection.getAccountInfo(dwalletPda);
  if (!info) { console.log('dWallet not found'); return; }
  const data = Buffer.from(info.data);
  const curve = data.readUInt16LE(34);
  const pkLen = data[37];
  const pkBytes = data.slice(38, 38 + pkLen);
  const paddedPk = data.slice(38, 38 + 65);
  
  const preimage = 'HumanRail Mandara demo approved request: Base Sepolia USDC transfer 42';
  const messageDigest = keccak_256(new TextEncoder().encode(preimage));
  const messageMetadataDigest = new Uint8Array(32);
  const userPubkey = payer.publicKey.toBytes();
  const signatureScheme = 0;
  const schemeBuf = Buffer.alloc(2);
  schemeBuf.writeUInt16LE(signatureScheme, 0);
  
  const candidates = [
    { name: 'actual PK (33b)', pk: pkBytes },
    { name: 'padded PK (65b)', pk: paddedPk },
  ];
  
  for (const cand of candidates) {
    const payload = Buffer.alloc(2 + cand.pk.length);
    payload.writeUInt16LE(curve, 0);
    cand.pk.copy(payload, 2);
    const seeds = [Buffer.from('dwallet')];
    for (let i = 0; i < payload.length; i += 32) {
      seeds.push(payload.subarray(i, Math.min(i + 32, payload.length)));
    }
    seeds.push(Buffer.from('message_approval'));
    seeds.push(schemeBuf);
    seeds.push(Buffer.from(messageDigest));
    
    const [maPda, maBump] = PublicKey.findProgramAddressSync(seeds, IKA_DWALLET_PROGRAM_ID_DEVNET);
    
    console.log(`\n=== Testing ${cand.name} ===`);
    console.log('PDA:', maPda.toBase58(), 'bump:', maBump);
    
    const ixData = Buffer.alloc(100);
    ixData[0] = 8;
    ixData[1] = maBump;
    Buffer.from(messageDigest).copy(ixData, 2);
    Buffer.from(messageMetadataDigest).copy(ixData, 34);
    Buffer.from(userPubkey).copy(ixData, 66);
    schemeBuf.copy(ixData, 98);
    
    const ix = new TransactionInstruction({
      keys: [
        { pubkey: coordinatorPda, isSigner: false, isWritable: false },
        { pubkey: maPda, isSigner: false, isWritable: true },
        { pubkey: dwalletPda, isSigner: false, isWritable: false },
        { pubkey: payer.publicKey, isSigner: false, isWritable: false },
        { pubkey: cpiAuthority, isSigner: true, isWritable: false },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: IKA_DWALLET_PROGRAM_ID_DEVNET,
      data: ixData,
    });
    
    const rb = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction();
    tx.recentBlockhash = rb.blockhash;
    tx.feePayer = payer.publicKey;
    tx.add(ix);
    tx.sign(payer);
    
    try {
      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log('Tx sent:', sig);
      await connection.confirmTransaction({ signature: sig, ...rb }, 'confirmed');
      console.log('Tx CONFIRMED!');
      
      const maInfo = await connection.getAccountInfo(maPda);
      if (maInfo) {
        console.log('MessageApproval EXISTS! Size:', maInfo.data.length);
      } else {
        console.log('MessageApproval NOT found');
      }
    } catch (err: any) {
      console.log('Tx FAILED:', err.message || String(err));
      if (err.logs) {
        for (const log of err.logs) {
          if (log.includes('error') || log.includes('Error') || log.includes('failed') || log.includes('privileged') || log.includes('escalated')) {
            console.log('  LOG:', log);
          }
        }
      }
    }
  }
}

main().catch(console.error);
