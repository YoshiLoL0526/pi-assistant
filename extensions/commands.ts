import type { AssistantConfig, UiStyle } from "./types.ts";
import { ASSISTANT_LABEL } from "./profile.ts";
import { openSettingsPanel } from "./settings-ui.ts";
import { helpText, renderHeader, updateAssistantWidget, updateStatus, updateWorkingIndicator } from "./ui.ts";

export function createCommandHandler(command: string, config: AssistantConfig) {
	return async (args: string, ctx: any) => {
		const arg = args.trim().toLowerCase();
		if (!arg || arg === "status") {
			ctx.ui.notify(
				`Assistant ${config.enabled ? "activo" : "inactivo"}. Perfil: ${ASSISTANT_LABEL}. Sonido: ${config.sound ? "on" : "off"}. UI: ${config.ui ? "on" : "off"}. Estilo: ${config.uiStyle}.`,
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
		const styleMatch = arg.match(/^style(?:\s+(animated|minimal|quiet))?$/);
		if (arg === "on") config.enabled = true;
		else if (arg === "off") config.enabled = false;
		else if (arg === "toggle") config.enabled = !config.enabled;
		else if (arg === "sound") config.sound = !config.sound;
		else if (styleMatch) {
			const styles: UiStyle[] = ["animated", "minimal", "quiet"];
			const requested = styleMatch[1] as UiStyle | undefined;
			config.uiStyle = requested ?? styles[(styles.indexOf(config.uiStyle) + 1) % styles.length];
			config.ui = true;
		} else if (arg === "ui") {
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
		if (ctx.mode === "tui" && config.ui) ctx.ui.setHeader(config.uiStyle === "quiet" ? undefined : (tui: any, theme: any) => renderHeader(config, theme, tui));
		updateStatus(ctx, config);
		updateAssistantWidget(ctx, config);
		updateWorkingIndicator(ctx, config);
		ctx.ui.notify(`Assistant: ${config.enabled ? "ON" : "OFF"} · ${ASSISTANT_LABEL} · estilo ${config.uiStyle}`, "info");
	};
}
