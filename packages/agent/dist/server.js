"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const index_js_1 = require("./index.js");
const PORT = process.env.AGENT_SERVER_PORT ? parseInt(process.env.AGENT_SERVER_PORT) : 4000;
const SECRET = process.env.AGENT_SERVER_SECRET || "dev-secret-change-in-production";
const agents = new Map();
function auth(req) {
    const authHeader = req.headers.authorization || "";
    return authHeader === `Bearer ${SECRET}`;
}
function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}
const server = http_1.default.createServer(async (req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const path = url.pathname;
    // Public health check
    if (path === "/health") {
        sendJson(res, 200, { status: "ok", agentsRunning: agents.size });
        return;
    }
    if (!auth(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
    }
    // Parse body for POST
    let body = "";
    if (req.method === "POST") {
        body = await new Promise((resolve) => {
            let data = "";
            req.on("data", (chunk) => (data += chunk));
            req.on("end", () => resolve(data));
        });
    }
    try {
        // POST /agents/start
        if (path === "/agents/start" && req.method === "POST") {
            const payload = JSON.parse(body);
            const { agentId, provider, apiKey, agentKeypair, principalPubkey, systemPrompt } = payload;
            if (!agentId || !provider || !apiKey || !agentKeypair || !principalPubkey) {
                sendJson(res, 400, { error: "Missing required fields" });
                return;
            }
            if (agents.has(agentId)) {
                sendJson(res, 409, { error: "Agent already running" });
                return;
            }
            const kp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(agentKeypair));
            const ppk = new web3_js_1.PublicKey(principalPubkey);
            const wsClients = new Set();
            const runtime = (0, index_js_1.createAgent)({
                provider,
                apiKey,
                agentKeypair: kp,
                principalPubkey: ppk,
                rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
                systemPrompt,
                onEvent: (event) => {
                    for (const ws of wsClients) {
                        if (ws.readyState === ws_1.WebSocket.OPEN) {
                            ws.send(JSON.stringify(event));
                        }
                    }
                },
            });
            agents.set(agentId, { id: agentId, runtime, provider, wsClients });
            sendJson(res, 200, { started: true, agentId });
            return;
        }
        // POST /agents/:agentId/stop
        const stopMatch = path.match(/^\/agents\/([^/]+)\/stop$/);
        if (stopMatch && req.method === "POST") {
            const agentId = stopMatch[1];
            const running = agents.get(agentId);
            if (!running) {
                sendJson(res, 404, { error: "Agent not found" });
                return;
            }
            for (const ws of running.wsClients)
                ws.close();
            running.wsClients.clear();
            agents.delete(agentId);
            sendJson(res, 200, { stopped: true, agentId });
            return;
        }
        // POST /agents/:agentId/chat
        const chatMatch = path.match(/^\/agents\/([^/]+)\/chat$/);
        if (chatMatch && req.method === "POST") {
            const agentId = chatMatch[1];
            const running = agents.get(agentId);
            if (!running) {
                sendJson(res, 404, { error: "Agent not running" });
                return;
            }
            const payload = JSON.parse(body);
            const message = payload.message;
            if (!message) {
                sendJson(res, 400, { error: "Missing message" });
                return;
            }
            const events = [];
            const responseText = await running.runtime.processMessage(message);
            sendJson(res, 200, { response: responseText, events });
            return;
        }
        // GET /agents/:agentId/status
        const statusMatch = path.match(/^\/agents\/([^/]+)\/status$/);
        if (statusMatch && req.method === "GET") {
            const agentId = statusMatch[1];
            const running = agents.get(agentId);
            if (!running) {
                sendJson(res, 404, { error: "Agent not running" });
                return;
            }
            const status = await running.runtime.agent.getStatus();
            sendJson(res, 200, status);
            return;
        }
        // GET /agents
        if (path === "/agents" && req.method === "GET") {
            const list = Array.from(agents.values()).map((a) => ({
                id: a.id,
                provider: a.provider,
                status: "running",
            }));
            sendJson(res, 200, { agents: list });
            return;
        }
        sendJson(res, 404, { error: "Not found" });
    }
    catch (err) {
        console.error("Server error:", err);
        sendJson(res, 500, { error: err.message || "Internal server error" });
    }
});
// WebSocket endpoint: /agents/:agentId/events
const wss = new ws_1.WebSocketServer({ server, path: "/agents/:agentId/events" });
// Since ws doesn't support path params natively like Express,
// we parse the URL manually.
wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/agents\/([^/]+)\/events$/);
    if (!match) {
        ws.close(1008, "Invalid path");
        return;
    }
    const agentId = match[1];
    const running = agents.get(agentId);
    if (!running) {
        ws.close(1008, "Agent not running");
        return;
    }
    running.wsClients.add(ws);
    ws.on("close", () => running.wsClients.delete(ws));
    ws.on("error", () => running.wsClients.delete(ws));
});
server.listen(PORT, () => {
    console.log(`Agent server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map