const HUMAN_REGISTRY_ERRORS: Record<number, string> = {
  6000: 'Unauthorized: must be issuer or profile owner',
  6001: 'Attestation already revoked',
  6002: 'Profile does not match attestation',
  6003: 'Issuer does not match attestation',
};

const AGENT_REGISTRY_ERRORS: Record<number, string> = {
  6000: 'AgentNotActive',
  6001: 'AgentAlreadyActive',
  6002: 'AgentRevoked',
  6003: 'AgentSuspended',
  6004: 'Unauthorized',
  6005: 'InvalidSigningKey',
  6006: 'KeyRotationInProgress',
  6007: 'NameTooLong',
  6008: 'InvalidMetadataHash',
  6009: 'InvalidPrincipal',
  6010: 'InsufficientHumanScore',
  6011: 'AgentRegistrationNotAllowed',
  6012: 'AgentAlreadyExists',
  6013: 'HasActiveCapabilities',
  6014: 'InvalidTeeMeasurement',
};

const DELEGATION_ERRORS: Record<number, string> = {
  6000: 'CapabilityNotActive',
  6001: 'CapabilityRevoked',
  6002: 'CapabilityExpired',
  6003: 'CapabilityFrozen',
  6004: 'CapabilityDisputed',
  6005: 'CapabilityNotYetValid',
  6006: 'PerTxLimitExceeded',
  6007: 'DailyLimitExceeded',
  6008: 'TotalLimitExceeded',
  6009: 'CooldownNotElapsed',
  6010: 'DestinationNotAllowed',
  6011: 'ProgramNotAllowed',
  6012: 'AssetNotAllowed',
  6013: 'SlippageExceeded',
  6014: 'FeeExceeded',
  6015: 'Unauthorized',
  6016: 'AgentMismatch',
  6017: 'InvalidExpiry',
  6018: 'InvalidLimits',
  6019: 'TooManyDestinations',
  6020: 'AgentFrozen',
  6021: 'AgentNotFrozen',
  6022: 'AlreadyDisputed',
  6023: 'NotDisputed',
  6024: 'RiskTierExceeded',
  6025: 'InvalidAgentProfile',
  6026: 'InvalidProgram',
  6027: 'AgentSignerMismatch',
};

const RECEIPTS_ERRORS: Record<number, string> = {};

const ALL_ERRORS: Record<string, Record<number, string>> = {
  humanRegistry: HUMAN_REGISTRY_ERRORS,
  agentRegistry: AGENT_REGISTRY_ERRORS,
  delegation: DELEGATION_ERRORS,
  receipts: RECEIPTS_ERRORS,
};

export function resolveError(code: number, program?: string): string {
  if (program && ALL_ERRORS[program]) {
    return ALL_ERRORS[program][code] ?? `Unknown error ${code} in ${program}`;
  }
  for (const [prog, errs] of Object.entries(ALL_ERRORS)) {
    if (errs[code]) return `${prog}: ${errs[code]}`;
  }
  return `Unknown error code: ${code}`;
}

export {
  HUMAN_REGISTRY_ERRORS,
  AGENT_REGISTRY_ERRORS,
  DELEGATION_ERRORS,
  RECEIPTS_ERRORS,
};
