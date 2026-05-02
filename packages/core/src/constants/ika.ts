export const IKA_PROGRAM_IDS = {
  DWALLET: "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",
} as const;

export const IKA_GRPC_URL =
  "https://pre-alpha-dev-1.ika.ika-network.net:443";

export const IKA_PRE_ALPHA_DISCLAIMER =
  "Ika is currently in pre-alpha. It uses a single mock signer and is not production MPC custody. Devnet data may be wiped periodically.";

export const IKA_SIGNATURE_SCHEMES = {
  EcdsaKeccak256: 0,
  EcdsaDoubleSha256: 1,
  EddsaSha512: 2,
} as const;
