import type { AssistantConfig } from "./types.ts";
import { configPath, saveConfig } from "./config.ts";
import { ASSISTANT_LABEL } from "./profile.ts";
import { helpText } from "./ui.ts";

function statusText(config: AssistantConfig): string {
	return `Assistant ${config.enabled ? "activo" : "inactivo"}. Perfil: ${ASSISTANT_LABEL}. Sonido: ${config.sound ? "on" : "off"}.`;
}

export function createCommandHandler(command: string, config: AssistantConfig) {
	return async (args: string, ctx: any) => {
		const arg = args.trim().toLowerCase();
		if (!arg || arg === "status") {
			ctx.ui.notify(statusText(config), "info");
			return;
		}
		if (arg === "help" || arg === "ayuda") {
			ctx.ui.notify(helpText(command), "info");
			return;
		}
		if (arg === "config-path") {
			ctx.ui.notify(`Config: ${configPath()}`, "info");
			return;
		}
		if (arg === "on") config.enabled = true;
		else if (arg === "off") config.enabled = false;
		else if (arg === "toggle") config.enabled = !config.enabled;
		else if (arg === "sound") config.sound = !config.sound;
		else {
			ctx.ui.notify(helpText(command), "warning");
			return;
		}
		const saved = saveConfig(config);
		ctx.ui.notify(`${statusText(config)}${saved ? "" : " No se pudo guardar config."}`, saved ? "info" : "warning");
	};
}
