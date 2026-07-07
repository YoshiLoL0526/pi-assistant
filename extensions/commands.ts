import type { AssistantConfig } from "./types.ts";
import { ASSISTANT_LABEL } from "./profile.ts";
import { openSettingsPanel } from "./settings-ui.ts";
import { helpText, renderHeader, updateAssistantWidget, updateStatus, updateWorkingIndicator } from "./ui.ts";

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
		if (arg === "settings" || arg === "config" || arg === "panel") {
			await openSettingsPanel(ctx, command, config);
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
				ctx.ui.setStatus("pi-assistant", undefined);
				updateAssistantWidget(ctx, config);
				updateWorkingIndicator(ctx, config);
			}
		} else {
			ctx.ui.notify(helpText(command), "warning");
			return;
		}
		if (ctx.mode === "tui" && config.ui) ctx.ui.setHeader((tui: any, theme: any) => renderHeader(config, theme, tui));
		updateStatus(ctx, config);
		updateAssistantWidget(ctx, config);
		updateWorkingIndicator(ctx, config);
		ctx.ui.notify(`Assistant: ${config.enabled ? "ON" : "OFF"} · ${ASSISTANT_LABEL}`, "info");
	};
}
