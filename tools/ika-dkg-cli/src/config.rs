use std::path::PathBuf;
use std::time::Duration;
use ika_dwallet_types::DWalletCurve;

pub struct CliConfig {
    pub curve: DWalletCurve,
    pub keypair_path: PathBuf,
    pub rpc_url: String,
    pub grpc_url: String,
    pub output_path: PathBuf,
    pub poll_timeout: Duration,
    pub skip_poll: bool,
}
