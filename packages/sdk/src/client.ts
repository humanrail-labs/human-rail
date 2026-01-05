import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import {
  HUMAN_REGISTRY_PROGRAM_ID,
  HUMAN_PAY_PROGRAM_ID,
  DATA_BLINK_PROGRAM_ID,
} from './constants';

import { IDL as HumanRegistryIDL } from './idl/human_registry';
import { IDL as HumanPayIDL } from './idl/human_pay';
import { IDL as DataBlinkIDL } from './idl/data_blink';

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

  readonly registryProgram: Program;
  readonly payProgram: Program;
  readonly blinkProgram: Program;

  constructor(config: HumanRailClientConfig) {
    this.connection = config.connection;
    
    if (!config.provider) {
      throw new Error('Provider is required. Use HumanRailClient.fromConnection() to create from wallet.');
    }
    
    this.provider = config.provider;
    this.registryProgramId = config.registryProgramId ?? HUMAN_REGISTRY_PROGRAM_ID;
    this.payProgramId = config.payProgramId ?? HUMAN_PAY_PROGRAM_ID;
    this.blinkProgramId = config.blinkProgramId ?? DATA_BLINK_PROGRAM_ID;

    // Initialize programs with Anchor 0.30+ style
    // IDLs contain the program address, so we just pass the provider
    this.registryProgram = new Program(
      HumanRegistryIDL as Idl,
      this.provider
    );

    this.payProgram = new Program(
      HumanPayIDL as Idl,
      this.provider
    );

    this.blinkProgram = new Program(
      DataBlinkIDL as Idl,
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
