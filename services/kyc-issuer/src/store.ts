import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface SessionRow {
  wallet_pubkey: string;
  veriff_session_id: string;
  status: string;
  payload_hash: string | null;
  tx_signature: string | null;
  attestation_pda: string | null;
  nonce: number;
  created_at: number;
  updated_at: number;
}

export class Store {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolved = dbPath ?? path.resolve(__dirname, '../data/kyc.db');
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        wallet_pubkey     TEXT NOT NULL,
        veriff_session_id TEXT NOT NULL PRIMARY KEY,
        status            TEXT NOT NULL DEFAULT 'created',
        payload_hash      TEXT,
        tx_signature      TEXT,
        attestation_pda   TEXT,
        nonce             INTEGER NOT NULL DEFAULT 0,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions(wallet_pubkey);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_wallet_nonce
        ON sessions(wallet_pubkey, nonce) WHERE nonce > 0;
    `);
  }

  createSession(walletPubkey: string, veriffSessionId: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO sessions (wallet_pubkey, veriff_session_id, status, created_at, updated_at)
      VALUES (?, ?, 'created', ?, ?)
    `).run(walletPubkey, veriffSessionId, now, now);
  }

  getBySessionId(veriffSessionId: string): SessionRow | undefined {
    return this.db.prepare(
      'SELECT * FROM sessions WHERE veriff_session_id = ?'
    ).get(veriffSessionId) as SessionRow | undefined;
  }

  getByWallet(walletPubkey: string): SessionRow | undefined {
    return this.db.prepare(
      'SELECT * FROM sessions WHERE wallet_pubkey = ? ORDER BY updated_at DESC LIMIT 1'
    ).get(walletPubkey) as SessionRow | undefined;
  }

  /** Get next unused nonce for a wallet (for on-chain attestation PDA derivation) */
  getNextNonce(walletPubkey: string): number {
    const row = this.db.prepare(
      'SELECT COALESCE(MAX(nonce), 0) + 1 AS next FROM sessions WHERE wallet_pubkey = ? AND nonce > 0'
    ).get(walletPubkey) as { next: number } | undefined;
    return row?.next ?? 1;
  }

  /** Check if session was already attested (idempotency) */
  isAlreadyAttested(veriffSessionId: string): boolean {
    const row = this.getBySessionId(veriffSessionId);
    return row?.status === 'attested';
  }

  updateStatus(
    veriffSessionId: string,
    status: string,
    extra?: { payloadHash?: string; txSignature?: string; attestationPda?: string; nonce?: number }
  ): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      UPDATE sessions SET
        status = ?,
        payload_hash = COALESCE(?, payload_hash),
        tx_signature = COALESCE(?, tx_signature),
        attestation_pda = COALESCE(?, attestation_pda),
        nonce = COALESCE(?, nonce),
        updated_at = ?
      WHERE veriff_session_id = ?
    `).run(
      status,
      extra?.payloadHash ?? null,
      extra?.txSignature ?? null,
      extra?.attestationPda ?? null,
      extra?.nonce ?? null,
      now,
      veriffSessionId
    );
  }

  close() { this.db.close(); }
}
