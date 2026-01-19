"use client";

import bs58 from "bs58";
import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId, deriveHumanProfilePda } from "@/lib/programs";
import { toast } from "sonner";

// ============================================================================
// DISCRIMINATORS (from IDL)
// ============================================================================
const DISCRIMINATORS = {
  registerDocument: Buffer.from([108, 34, 153, 39, 82, 41, 133, 73]),
  signDocumentVerified: Buffer.from([206, 24, 10, 213, 161, 57, 46, 23]),
  signDocumentTx: Buffer.from([215, 18, 24, 33, 147, 69, 109, 113]),
};

// ============================================================================
// TYPES
// ============================================================================
export interface DocumentRecord {
  pubkey: PublicKey;
  docHash: Uint8Array;
  docHashHex: string;
  creator: PublicKey;
  schema: string;
  uri: string | null;
  status: "Draft" | "Active" | "Finalized" | "Disputed";
  signatureCount: number;
  createdAt: number;
  finalizedAt: number | null;
}

export interface SignatureRecord {
  pubkey: PublicKey;
  document: PublicKey;
  signerPubkey: PublicKey;
  signerType: "Human" | "Agent" | "Organization";
  role: string;
  tier: "WalletNotarization" | "VerifiedSigner" | "AgentOnBehalf";
  status: "Active" | "Revoked";
  signedAt: number;
  humanScoreAtSigning: number;
}

export enum HashAlgorithm {
  Sha256 = 0,
  Sha3_256 = 1,
  Blake3 = 2,
  Keccak256 = 3,
}

// ============================================================================
// PDA DERIVATION
// ============================================================================
function deriveDocumentPda(docHash: Uint8Array, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("document"), Buffer.from(docHash)],
    programId
  );
}

function deriveSignatureRecordPda(
  document: PublicKey,
  signer: PublicKey,
  role: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("signature"), document.toBuffer(), signer.toBuffer(), Buffer.from(role)],
    programId
  );
}

function deriveSigningReceiptPda(
  document: PublicKey,
  signer: PublicKey,
  role: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("signing_receipt"), document.toBuffer(), signer.toBuffer(), Buffer.from(role)],
    programId
  );
}

// ============================================================================
// ENCODING HELPERS
// ============================================================================
function padToBytes(str: string, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const encoded = new TextEncoder().encode(str);
  bytes.set(encoded.slice(0, length));
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length !== 64) {
    throw new Error("Invalid SHA-256 hash: must be 64 hex characters");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeRegisterDocumentParams(
  docHash: Uint8Array,
  schema: string,
  uri: string | null
): Buffer {
  // RegisterDocumentParams layout:
  // doc_hash: [u8; 32]
  // hash_algorithm: u8 (enum)
  // schema: [u8; 32]
  // uri: [u8; 128]
  // has_uri: bool
  // metadata_hash: [u8; 32]
  // has_metadata: bool
  // version_of: Option<Pubkey> (1 byte flag + 32 bytes if Some)

  const buffer = Buffer.alloc(8 + 32 + 1 + 32 + 128 + 1 + 32 + 1 + 1 + 32);
  let offset = 0;

  // discriminator
  DISCRIMINATORS.registerDocument.copy(buffer, offset);
  offset += 8;

  // doc_hash
  Buffer.from(docHash).copy(buffer, offset);
  offset += 32;

  // hash_algorithm (Sha256 = 0)
  buffer.writeUInt8(HashAlgorithm.Sha256, offset);
  offset += 1;

  // schema
  const schemaBytes = padToBytes(schema, 32);
  Buffer.from(schemaBytes).copy(buffer, offset);
  offset += 32;

  // uri
  if (uri) {
    const uriBytes = padToBytes(uri, 128);
    Buffer.from(uriBytes).copy(buffer, offset);
  }
  offset += 128;

  // has_uri
  buffer.writeUInt8(uri ? 1 : 0, offset);
  offset += 1;

  // metadata_hash (empty)
  offset += 32;

  // has_metadata
  buffer.writeUInt8(0, offset);
  offset += 1;

  // version_of (None)
  buffer.writeUInt8(0, offset);
  offset += 1;

  return buffer.slice(0, offset);
}

function encodeSignDocumentVerifiedParams(role: string): Buffer {
  // SignDocumentTxParams layout:
  // role: [u8; 32]
  // signature_metadata: [u8; 64]
  // has_metadata: bool

  const buffer = Buffer.alloc(8 + 32 + 64 + 1);
  let offset = 0;

  // discriminator
  DISCRIMINATORS.signDocumentVerified.copy(buffer, offset);
  offset += 8;

  // role
  const roleBytes = padToBytes(role, 32);
  Buffer.from(roleBytes).copy(buffer, offset);
  offset += 32;

  // signature_metadata (empty)
  offset += 64;

  // has_metadata
  buffer.writeUInt8(0, offset);
  offset += 1;

  return buffer.slice(0, offset);
}

// ============================================================================
// ACCOUNT PARSING
// ============================================================================
function parseDocumentStatus(byte: number): "Draft" | "Active" | "Finalized" | "Disputed" {
  switch (byte) {
    case 0: return "Draft";
    case 1: return "Active";
    case 2: return "Finalized";
    case 3: return "Disputed";
    default: return "Draft";
  }
}

function parseSignerType(byte: number): "Human" | "Agent" | "Organization" {
  switch (byte) {
    case 0: return "Human";
    case 1: return "Agent";
    case 2: return "Organization";
    default: return "Human";
  }
}

function parseSignatureTier(byte: number): "WalletNotarization" | "VerifiedSigner" | "AgentOnBehalf" {
  switch (byte) {
    case 0: return "WalletNotarization";
    case 1: return "VerifiedSigner";
    case 2: return "AgentOnBehalf";
    default: return "WalletNotarization";
  }
}

function parseSignatureStatus(byte: number): "Active" | "Revoked" {
  return byte === 0 ? "Active" : "Revoked";
}

function parseDocument(pubkey: PublicKey, data: Buffer): DocumentRecord | null {
  try {
    if (data.length < 150) return null;

    let offset = 8; // Skip discriminator

    const docHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    // hash_algorithm (1 byte)
    offset += 1;

    const schemaBytes = data.slice(offset, offset + 32);
    const schema = Buffer.from(schemaBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const uriBytes = data.slice(offset, offset + 128);
    offset += 128;

    const hasUri = data[offset] === 1;
    offset += 1;

    const uri = hasUri ? Buffer.from(uriBytes).toString("utf-8").replace(/\0/g, "").trim() : null;

    // Skip metadata_hash (32) + has_metadata (1)
    offset += 33;

    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const status = parseDocumentStatus(data[offset]);
    offset += 1;

    const signatureCount = data.readUInt32LE(offset);
    offset += 4;

    // Skip required_signers_count (1)
    offset += 1;

    const createdAtSlot = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip finalized_at_slot
    offset += 8;

    const finalizedAtTs = Number(data.readBigInt64LE(offset));
    const finalizedAt = finalizedAtTs > 0 ? finalizedAtTs : null;

    return {
      pubkey,
      docHash,
      docHashHex: bytesToHex(docHash),
      creator,
      schema,
      uri,
      status,
      signatureCount,
      createdAt,
      finalizedAt,
    };
  } catch (e) {
    console.error("Failed to parse document:", e);
    return null;
  }
}

function parseSignatureRecord(pubkey: PublicKey, data: Buffer): SignatureRecord | null {
  try {
    if (data.length < 200) return null;

    let offset = 8; // Skip discriminator

    const document = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const signerType = parseSignerType(data[offset]);
    offset += 1;

    const signerPubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Skip principal_pubkey (32) + has_principal (1) + capability_id (32) + has_capability (1)
    // + attestation_id (32) + has_attestation (1) + signature_mode (1) + signature_bytes (64) + has_signature_bytes (1)
    offset += 32 + 1 + 32 + 1 + 32 + 1 + 1 + 64 + 1;

    const roleBytes = data.slice(offset, offset + 32);
    const role = Buffer.from(roleBytes).toString("utf-8").replace(/\0/g, "").trim();
    offset += 32;

    const tier = parseSignatureTier(data[offset]);
    offset += 1;

    const status = parseSignatureStatus(data[offset]);
    offset += 1;

    // Skip signed_at_slot
    offset += 8;

    const signedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // Skip revoked_at_slot (8) + revoked_at_ts (8) + metadata (64) + has_metadata (1)
    offset += 8 + 8 + 64 + 1;

    const humanScoreAtSigning = data.readUInt16LE(offset);

    return {
      pubkey,
      document,
      signerPubkey,
      signerType,
      role,
      tier,
      status,
      signedAt,
      humanScoreAtSigning,
    };
  } catch (e) {
    console.error("Failed to parse signature record:", e);
    return null;
  }
}

// ============================================================================
// HOOK
// ============================================================================
export function useDocumentRegistry() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { cluster } = useCluster();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programId = getProgramId(cluster, "documentRegistry");
  const humanRegistryProgramId = getProgramId(cluster, "humanRegistry");

  // Fetch documents created by user
  const fetchDocuments = useCallback(async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all Document accounts where creator matches publicKey
      // Document discriminator: first 8 bytes of sha256("account:Document")
      const documentDiscriminator = Buffer.from([85, 195, 241, 220, 115, 30, 81, 97]);

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { memcmp: { offset: 0, bytes: bs58.encode(documentDiscriminator) } },
          // creator is at offset 8 + 32 + 1 + 32 + 128 + 1 + 32 + 1 = 235
          { memcmp: { offset: 235, bytes: publicKey.toBase58() } },
        ],
      });

      const parsed = accounts
        .map(({ pubkey, account }) => parseDocument(pubkey, account.data as Buffer))
        .filter((d): d is DocumentRecord => d !== null)
        .sort((a, b) => b.createdAt - a.createdAt);

      setDocuments(parsed);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, programId]);

  // Fetch signatures by user
  const fetchSignatures = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      // SignatureRecord discriminator
      const signatureDiscriminator = Buffer.from([69, 228, 109, 143, 96, 230, 108, 86]);

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { memcmp: { offset: 0, bytes: bs58.encode(signatureDiscriminator) } },
          // signer_pubkey is at offset 8 + 32 + 1 = 41
          { memcmp: { offset: 41, bytes: publicKey.toBase58() } },
        ],
      });

      const parsed = accounts
        .map(({ pubkey, account }) => parseSignatureRecord(pubkey, account.data as Buffer))
        .filter((s): s is SignatureRecord => s !== null)
        .sort((a, b) => b.signedAt - a.signedAt);

      setSignatures(parsed);
    } catch (err) {
      console.error("Failed to fetch signatures:", err);
    }
  }, [publicKey, connection, programId]);

  // Only fetch once when wallet connects - prevents rate limiting
  const hasFetchedRef = useRef(false);
  const prevPublicKey = useRef<string | null>(null);
  
  useEffect(() => {
    const currentKey = publicKey?.toBase58() || null;
    
    // Only fetch if wallet changed or first load
    if (currentKey && currentKey !== prevPublicKey.current) {
      prevPublicKey.current = currentKey;
      hasFetchedRef.current = false;
    }
    
    if (!publicKey || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    // Stagger requests
    const t1 = setTimeout(() => fetchDocuments(), 200);
    const t2 = setTimeout(() => fetchSignatures(), 800);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [publicKey, fetchDocuments, fetchSignatures]);

  // Register a new document
  const registerDocument = useCallback(
    async (docHashHex: string, schema: string, uri?: string): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const docHash = hexToBytes(docHashHex);
      const [documentPda] = deriveDocumentPda(docHash, programId);

      const data = encodeRegisterDocumentParams(docHash, schema, uri || null);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: documentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Simulate first
      const simResult = await connection.simulateTransaction(transaction);
      if (simResult.value.err) {
        console.error("Simulation error:", simResult.value.err);
        console.error("Logs:", simResult.value.logs);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simResult.value.err)}`);
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await fetchDocuments();
      return signature;
    },
    [publicKey, connection, programId, sendTransaction, fetchDocuments]
  );

  // Sign document with verified human profile
  const signDocumentVerified = useCallback(
    async (docHashHex: string, role: string): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const docHash = hexToBytes(docHashHex);
      const roleBytes = padToBytes(role, 32);

      const [documentPda] = deriveDocumentPda(docHash, programId);
      const [humanProfilePda] = deriveHumanProfilePda(publicKey, cluster);
      const [signatureRecordPda] = deriveSignatureRecordPda(documentPda, publicKey, roleBytes, programId);
      const [signingReceiptPda] = deriveSigningReceiptPda(documentPda, publicKey, roleBytes, programId);

      const data = encodeSignDocumentVerifiedParams(role);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: humanProfilePda, isSigner: false, isWritable: false },
          { pubkey: documentPda, isSigner: false, isWritable: true },
          { pubkey: signatureRecordPda, isSigner: false, isWritable: true },
          { pubkey: signingReceiptPda, isSigner: false, isWritable: true },
          { pubkey: humanRegistryProgramId, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Simulate first
      const simResult = await connection.simulateTransaction(transaction);
      if (simResult.value.err) {
        console.error("Simulation error:", simResult.value.err);
        console.error("Logs:", simResult.value.logs);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simResult.value.err)}`);
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await fetchDocuments();
      await fetchSignatures();
      return signature;
    },
    [publicKey, connection, programId, humanRegistryProgramId, cluster, sendTransaction, fetchDocuments, fetchSignatures]
  );

  // Combined: Register + Sign in one flow (with existence check)
  const registerAndSign = useCallback(
    async (docHashHex: string, schema: string, role: string, uri?: string): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }
      
      const docHash = hexToBytes(docHashHex);
      const [documentPda] = deriveDocumentPda(docHash, programId);
      
      // Check if document already exists
      const existingAccount = await connection.getAccountInfo(documentPda);
      
      if (!existingAccount) {
        // Document doesn't exist, register it first
        console.log("Document not found, registering...");
        await registerDocument(docHashHex, schema, uri);
      } else {
        console.log("Document already registered, skipping to sign...");
      }
      
      // Then sign
      return signDocumentVerified(docHashHex, role);
    },
    [publicKey, connection, programId, registerDocument, signDocumentVerified]
  );

  return {
    documents,
    signatures,
    loading,
    error,
    registerDocument,
    signDocumentVerified,
    registerAndSign,
    refetch: useCallback(() => {
      fetchDocuments();
      fetchSignatures();
    }, [fetchDocuments, fetchSignatures]),
  };
}
