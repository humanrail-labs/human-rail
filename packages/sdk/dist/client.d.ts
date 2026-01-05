import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
export interface HumanRailClientConfig {
    connection: Connection;
    provider?: AnchorProvider;
    registryProgramId?: PublicKey;
    payProgramId?: PublicKey;
    blinkProgramId?: PublicKey;
}
export declare class HumanRailClient {
    readonly connection: Connection;
    readonly provider: AnchorProvider;
    readonly registryProgramId: PublicKey;
    readonly payProgramId: PublicKey;
    readonly blinkProgramId: PublicKey;
    readonly registryProgram: Program;
    readonly payProgram: Program;
    readonly blinkProgram: Program;
    constructor(config: HumanRailClientConfig);
    static fromConnection(connection: Connection, wallet: AnchorProvider['wallet']): HumanRailClient;
    get wallet(): PublicKey;
}
//# sourceMappingURL=client.d.ts.map