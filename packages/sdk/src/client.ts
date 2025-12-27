import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import {
  HUMAN_REGISTRY_PROGRAM_ID,
  HUMAN_PAY_PROGRAM_ID,
  DATA_BLINK_PROGRAM_ID,
} from './constants';

import { HumanRegistry, IDL as HumanRegistryIDL } from './idl/human_registry';
import { HumanPay, IDL as HumanPayIDL } from './idl/human_pay';
import { DataBlink, IDL as DataBlinkIDL } from './idl/data_blink';

export interface HumanRailClientConfig {
  connection: Connection;
  provider?: AnchorProvider;
  registryProgramId?: PublicKey;
  payProgramId?: PublicKey;
  blinkProgramId?: PublicKey;
}

export class HumanRailClient {
  readonly connection: Connection;
  readonly provider: AnchorProvider;
  readonly registryProgramId: PublicKey;
  readonly payProgramId: PublicKey;
  readonly blinkProgramId: PublicKey;

  readonly registryProgram: Program<HumanRegistry>;
  readonly payProgram: Program<HumanPay>;
  readonly blinkProgram: Program<DataBlink>;

  constructor(config: HumanRailClientConfig) {
    this.connection = config.connection;
    
    if (!config.provider) {
      throw new Error('Provider is required. Use HumanRailClient.fromConnection() to create from wallet.');
    }
    
    this.provider = config.provider;
    this.registryProgramId = config.registryProgramId ?? HUMAN_REGISTRY_PROGRAM_ID;
    this.payProgramId = config.payProgramId ?? HUMAN_PAY_PROGRAM_ID;
    this.blinkProgramId = config.blinkProgramId ?? DATA_BLINK_PROGRAM_ID;

    // Initialize programs with explicit program IDs and IDLs
    this.registryProgram = new Program<HumanRegistry>(
      HumanRegistryIDL,
      this.registryProgramId,
      this.provider
    );

    this.payProgram = new Program<HumanPay>(
      HumanPayIDL,
      this.payProgramId,
      this.provider
    );

    this.blinkProgram = new Program<DataBlink>(
      DataBlinkIDL,
      this.blinkProgramId,
      this.provider
    );
  }

  static fromConnection(
    connection: Connection,
    wallet: AnchorProvider['wallet']
  ): HumanRailClient {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    return new HumanRailClient({
      connection,
      provider,
    });
  }

  get wallet(): PublicKey {
    return this.provider.wallet.publicKey;
  }
}
