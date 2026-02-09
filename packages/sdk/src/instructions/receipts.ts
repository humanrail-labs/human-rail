import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, Idl, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_IDS } from '../constants';
import { deriveReceipt, deriveReceiptIndex } from '../pda';
import ReceiptsIDL from '../idl/receipts.json';

function rcProgram(provider: AnchorProvider): Program {
  return new (Program as any)(ReceiptsIDL as Idl, PROGRAM_IDS.receipts, provider);
}

export interface EmitReceiptParams {
  actionHash: number[];
  resultHash: number[];
  actionType: number;
  value: BN;
  destination: PublicKey;
  offchainRef: number[];
  hasOffchainRef: boolean;
  nonce: BN;
}

export async function emitReceipt(
  provider: AnchorProvider,
  emitter: PublicKey,
  agentPda: PublicKey,
  params: EmitReceiptParams
): Promise<TransactionInstruction> {
  const program = rcProgram(provider);
  const [receipt] = deriveReceipt(agentPda, params.nonce.toNumber());
  const [agentIndex] = deriveReceiptIndex(agentPda);
  return await (program.methods as any)
    .emitReceipt(params)
    .accounts({
      emitter,
      agentProfile: agentPda,
      receipt,
      agentIndex,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}
