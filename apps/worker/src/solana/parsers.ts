import { PublicKey } from "@solana/web3.js";
import {
  IKA_DISC_DWALLET,
  IKA_DISC_MESSAGE_APPROVAL,
  IKA_DWALLET_LEN,
  IKA_MESSAGE_APPROVAL_LEN,
  DWalletCurve,
  DWalletState,
  IkaSignatureScheme,
  MessageApprovalStatus,
} from "./types.js";
import type { IkaDwallet, IkaMessageApproval } from "./types.js";

export function parseIkaDwalletAccount(data: Buffer | Uint8Array): IkaDwallet | null {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf.length < IKA_DWALLET_LEN) return null;
  if (buf[0] !== IKA_DISC_DWALLET) return null;

  const authority = new PublicKey(buf.slice(2, 34));
  const curveRaw = buf.readUInt16LE(34);
  const curve = Object.values(DWalletCurve).includes(curveRaw) ? (curveRaw as DWalletCurve) : DWalletCurve.Secp256k1;
  const stateRaw = buf[36];
  const state = Object.values(DWalletState).includes(stateRaw) ? (stateRaw as DWalletState) : DWalletState.DKGInProgress;
  const publicKeyLen = buf[37];
  const publicKey = new Uint8Array(buf.slice(38, 38 + Math.min(publicKeyLen, 65)));
  const createdEpoch = buf.readBigUInt64LE(103);
  const noaPublicKey = new PublicKey(buf.slice(111, 143));
  const isImported = buf[143] === 1;
  const bump = buf[144];

  return { discriminator: buf[0], version: buf[1], authority, curve, state, publicKeyLen, publicKey, createdEpoch, noaPublicKey, isImported, bump };
}

export function parseIkaMessageApprovalAccount(data: Buffer | Uint8Array): IkaMessageApproval | null {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf.length < IKA_MESSAGE_APPROVAL_LEN) return null;
  if (buf[0] !== IKA_DISC_MESSAGE_APPROVAL) return null;

  const dwallet = new PublicKey(buf.slice(2, 34));
  const messageDigest = new Uint8Array(buf.slice(34, 66));
  const messageMetadataDigest = new Uint8Array(buf.slice(66, 98));
  const approver = new PublicKey(buf.slice(98, 130));
  const userPubkey = new PublicKey(buf.slice(130, 162));
  const schemeRaw = buf.readUInt16LE(162);
  const signatureScheme = Object.values(IkaSignatureScheme).includes(schemeRaw) ? (schemeRaw as IkaSignatureScheme) : IkaSignatureScheme.EcdsaKeccak256;
  const epoch = buf.readBigUInt64LE(164);
  const statusRaw = buf[172];
  const status = statusRaw === 1 ? MessageApprovalStatus.Signed : MessageApprovalStatus.Pending;
  const signatureLen = buf.readUInt16LE(173);
  const sigEnd = 175 + signatureLen;
  if (sigEnd > buf.length) throw new Error(`Signature length ${signatureLen} exceeds buffer ${buf.length}`);
  const signature = new Uint8Array(buf.slice(175, sigEnd));
  const bump = buf[303];

  return { discriminator: buf[0], version: buf[1], dwallet, messageDigest, messageMetadataDigest, approver, userPubkey, signatureScheme, epoch, status, signatureLen, signature, bump };
}
