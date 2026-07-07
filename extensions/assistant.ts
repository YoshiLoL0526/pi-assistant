import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerAskUserTool } from "./ask-user-tool.ts";
import { createCommandHandler } from "./commands.ts";
import { config } from "./config.ts";
import { assistantInstructions } from "./profile.ts";
import { playSound } from "./sound.ts";

export default function assistantExtension(pi: ExtensionAPI) {
	registerAskUserTool(pi, () => playSound("attention", config.sound));
	pi.registerCommand("assistant", { description: "Controla el asistente de programación global", handler: createCommandHandler("/assistant", config) });
	pi.registerCommand("asistente", { description: "Alias en español de /assistant", handler: createCommandHandler("/asistente", config) });
	pi.on("before_agent_start", async (event) => {
		if (!config.enabled) return undefined;
		return { systemPrompt: event.systemPrompt + assistantInstructions() };
	});
	pi.on("agent_end", async () => {
		playSound("done", config.sound);
	});
}
