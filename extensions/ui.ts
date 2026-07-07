import type { Theme } from "@earendil-works/pi-coding-agent";
import type { AssistantConfig } from "./types.ts";
import { ASSISTANT_LABEL } from "./profile.ts";

export function renderHeader(config: AssistantConfig, theme: Theme) {
	return {
		render(_width: number): string[] {
			const accent = (text: string) => theme.fg("accent", text);
			const dim = (text: string) => theme.fg("dim", text);
			const success = (text: string) => theme.fg("success", text);
			const state = config.enabled ? success("ON") : theme.fg("error", "OFF");
			return [
				"",
				`${accent("◈ Pi Assistant")} ${dim("— asistente desarrollador de software")}`,
				`${dim("Perfil:")} ${accent(ASSISTANT_LABEL)}  ${dim("Estado:")} ${state}  ${dim("Comando:")} /assistant`,
				"",
			];
		},
		invalidate() {},
	};
}

export function updateStatus(ctx: any, config: AssistantConfig): void {
	if (ctx.mode !== "tui" || !config.ui) return;
	const theme = ctx.ui.theme;
	const state = config.enabled ? theme.fg("success", "●") : theme.fg("dim", "○");
	ctx.ui.setStatus("pi-assistant", `${state} ${theme.fg("dim", ASSISTANT_LABEL)}`);
}

export function helpText(command = "/assistant"): string {
	return `Uso: ${command} [on|off|toggle|status|sound|ui|help]

Perfil activo:
- ${ASSISTANT_LABEL}: asistente desarrollador de software con control humano para decisiones críticas`;
}
