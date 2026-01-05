import { PublicKey } from '@solana/web3.js';
import { HumanRailClient } from './client';
export declare function deriveHumanProfilePda(wallet: PublicKey, programId: PublicKey): [PublicKey, number];
export declare function getHumanProfile(client: HumanRailClient, wallet: PublicKey): Promise<any>;
export declare function initProfile(client: HumanRailClient): Promise<string>;
export declare function registerAttestation(client: HumanRailClient, source: PublicKey, payloadHash: Uint8Array | number[], weight: number): Promise<string>;
//# sourceMappingURL=registry.d.ts.map