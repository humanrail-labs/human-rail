import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";

const IKA_PROGRAM_ID = new PublicKey("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

const DISCRIMINATORS = {
  approveGuardedMessage: Buffer.from([161, 49, 124, 159, 1, 54, 243, 30]),
};

export function buildApproveGuardedMessageIx(
  guardProgramId: PublicKey,
  params: {
    requester: PublicKey;
    guardedDwallet: PublicKey;
    guardSigningRequest: PublicKey;
    dwallet: PublicKey;
    agentRegistryAccount?: PublicKey | null;
    cpiAuthority: PublicKey;
    coordinator: PublicKey;
    messageApproval: PublicKey;
    requestId: Uint8Array;
    messageDigest: Uint8Array;
    messageMetadataDigest: Uint8Array;
    destinationChainId: number;
    assetHash: Uint8Array;
    recipientHash: Uint8Array;
    amount: bigint;
    userPubkey: Uint8Array;
    signatureScheme: number;
    messageApprovalBump: number;
  }
): TransactionInstruction {
  const data = Buffer.alloc(8 + 32 + 32 + 32 + 4 + 32 + 32 + 8 + 32 + 2 + 1);
  let offset = 0;
  DISCRIMINATORS.approveGuardedMessage.copy(data, offset);
  offset += 8;
  Buffer.from(params.requestId).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageDigest).copy(data, offset);
  offset += 32;
  Buffer.from(params.messageMetadataDigest).copy(data, offset);
  offset += 32;
  data.writeUInt32LE(params.destinationChainId, offset);
  offset += 4;
  Buffer.from(params.assetHash).copy(data, offset);
  offset += 32;
  Buffer.from(params.recipientHash).copy(data, offset);
  offset += 32;
  const amountView = new DataView(data.buffer, data.byteOffset + offset, 8);
  amountView.setBigUint64(0, params.amount, true);
  offset += 8;
  Buffer.from(params.userPubkey).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(params.signatureScheme, offset);
  offset += 2;
  data.writeUInt8(params.messageApprovalBump, offset);

  const keys = [
    { pubkey: params.requester, isSigner: true, isWritable: true },
    { pubkey: params.guardedDwallet, isSigner: false, isWritable: true },
    { pubkey: params.guardSigningRequest, isSigner: false, isWritable: true },
    { pubkey: params.dwallet, isSigner: false, isWritable: false },
    { pubkey: params.agentRegistryAccount ?? guardProgramId, isSigner: false, isWritable: false },
    { pubkey: params.cpiAuthority, isSigner: false, isWritable: false },
    { pubkey: guardProgramId, isSigner: false, isWritable: false },
    { pubkey: IKA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.coordinator, isSigner: false, isWritable: false },
    { pubkey: params.messageApproval, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ keys, programId: guardProgramId, data });
}
