import type { Theme } from "@earendil-works/pi-coding-agent";
import type { AssistantConfig } from "./types.ts";
import { ASSISTANT_LABEL } from "./profile.ts";
import { helpText, renderHeader, updateStatus } from "./ui.ts";

export function createCommandHandler(command: string, config: AssistantConfig) {
	return async (args: string, ctx: any) => {
		const arg = args.trim().toLowerCase();
		if (!arg || arg === "status") {
			ctx.ui.notify(
				`Assistant ${config.enabled ? "activo" : "inactivo"}. Perfil: ${ASSISTANT_LABEL}. Sonido: ${config.sound ? "on" : "off"}. UI: ${config.ui ? "on" : "off"}.`,
				"info",
			);
			updateStatus(ctx, config);
			return;
		}
		if (arg === "help" || arg === "ayuda") {
			ctx.ui.notify(helpText(command), "info");
			return;
		}
		if (arg === "on") config.enabled = true;
		else if (arg === "off") config.enabled = false;
		else if (arg === "toggle") config.enabled = !config.enabled;
		else if (arg === "sound") config.sound = !config.sound;
		else if (arg === "ui") {
			config.ui = !config.ui;
			if (ctx.mode === "tui" && !config.ui) {
				ctx.ui.setHeader(undefined);
				ctx.ui.setStatus("pi-assistant", "");
			}
		} else {
			ctx.ui.notify(helpText(command), "warning");
			return;
		}
		if (ctx.mode === "tui" && config.ui) ctx.ui.setHeader((_tui: unknown, theme: Theme) => renderHeader(config, theme));
		updateStatus(ctx, config);
		ctx.ui.notify(`Assistant: ${config.enabled ? "ON" : "OFF"} · ${ASSISTANT_LABEL}`, "info");
	};
}
