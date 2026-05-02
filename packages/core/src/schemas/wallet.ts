import { z } from "zod";

export const IkaDwalletCurve = z.enum([
  "Secp256k1",
  "Secp256r1",
  "Curve25519",
  "Ristretto",
]);
export type IkaDwalletCurve = z.infer<typeof IkaDwalletCurve>;

export const IkaDwalletState = z.enum([
  "DKGInProgress",
  "Active",
  "Frozen",
]);
export type IkaDwalletState = z.infer<typeof IkaDwalletState>;

export const ImportIkaDwalletSchema = z.object({
  organizationId: z.string().cuid2().optional(),
  name: z.string().min(1).max(100).optional(),
  dwalletPda: z.string().min(32).max(44),
  signingPublicKey: z.string().optional(),
  curve: IkaDwalletCurve,
  authority: z.string().optional(),
  state: IkaDwalletState.default("Active"),
  ikaProgramId: z.string().optional(),
  guardCpiAuthority: z.string().optional(),
  authorityTransferSignature: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ImportIkaDwalletInput = z.infer<typeof ImportIkaDwalletSchema>;
