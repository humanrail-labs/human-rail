import { HumanRailAgent } from "@humanrail/sdk";
import type { ToolCall } from "./providers/types.js";
export declare class ToolExecutor {
    private agent;
    constructor(agent: HumanRailAgent);
    execute(toolCall: ToolCall): Promise<string>;
}
//# sourceMappingURL=executor.d.ts.map