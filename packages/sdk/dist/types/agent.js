"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStatus = void 0;
exports.createAgentName = createAgentName;
exports.decodeAgentName = decodeAgentName;
// Agent status enum
var AgentStatus;
(function (AgentStatus) {
    AgentStatus[AgentStatus["Active"] = 0] = "Active";
    AgentStatus[AgentStatus["Suspended"] = 1] = "Suspended";
    AgentStatus[AgentStatus["Revoked"] = 2] = "Revoked";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
// Helper to create agent name from string
function createAgentName(name) {
    const bytes = new Uint8Array(32);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(name.slice(0, 32));
    bytes.set(encoded);
    return bytes;
}
// Helper to decode agent name
function decodeAgentName(bytes) {
    const decoder = new TextDecoder();
    const nullIndex = bytes.indexOf(0);
    return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}
//# sourceMappingURL=agent.js.map