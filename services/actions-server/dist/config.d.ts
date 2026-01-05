import { PublicKey } from '@solana/web3.js';
export interface Config {
    port: number;
    rpcUrl: string;
    cluster: 'mainnet-beta' | 'devnet' | 'localnet';
    programIds: {
        humanRegistry: PublicKey;
        humanPay: PublicKey;
        dataBlink: PublicKey;
    };
    baseUrl: string;
    iconUrl: string;
}
export declare const config: Config;
