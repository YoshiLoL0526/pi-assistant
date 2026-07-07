import type { Theme } from "@earendil-works/pi-coding-agent";
import type { AssistantConfig } from "./types.ts";
import { ASSISTANT_LABEL } from "./profile.ts";

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

function visibleWidth(text: string): number {
	return text.replace(ANSI_RE, "").length;
}

function fitLine(text: string, width: number): string {
	if (width <= 0) return "";
	if (visibleWidth(text) <= width) return text;
	const plain = text.replace(ANSI_RE, "");
	return plain.length > width ? plain.slice(0, Math.max(0, width - 1)) + "…" : plain;
}

function boxedLine(content: string, width: number, theme: Theme): string {
	const border = (text: string) => theme.fg("borderMuted", text);
	const innerWidth = Math.max(0, width - 4);
	const fitted = fitLine(content, innerWidth);
	const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(fitted)));
	return fitLine(`${border("│")} ${fitted}${padding} ${border("│")}`, width);
}

export function renderHeader(config: AssistantConfig, theme: Theme) {
	return {
		render(width: number): string[] {
			const lineWidth = Math.max(24, Math.min(width, 88));
			const border = (text: string) => theme.fg("borderMuted", text);
			const accent = (text: string) => theme.fg("accent", text);
			const muted = (text: string) => theme.fg("muted", text);
			const dim = (text: string) => theme.fg("dim", text);
			const ok = (text: string) => theme.fg("success", text);
			const off = (text: string) => theme.fg("error", text);
			const state = config.enabled ? ok("● activo") : off("○ inactivo");
			const sound = config.sound ? ok("sonido") : dim("sonido off");
			const ui = config.ui ? ok("ui") : dim("ui off");
			const title = `${accent(theme.bold("◈ Pi Assistant"))} ${dim("/ software developer")}`;
			const meta = `${state} ${dim("·")} ${accent(ASSISTANT_LABEL)} ${dim("·")} ${sound} ${dim("·")} ${ui}`;
			const hint = `${dim("Comandos:")} ${muted("/assistant status")} ${dim("·")} ${muted("/assistant toggle")} ${dim("·")} ${muted("/assistant ui")}`;
			return [
				"",
				border(`╭${"─".repeat(Math.max(0, lineWidth - 2))}╮`),
				boxedLine(title, lineWidth, theme),
				boxedLine(meta, lineWidth, theme),
				boxedLine(hint, lineWidth, theme),
				border(`╰${"─".repeat(Math.max(0, lineWidth - 2))}╯`),
				"",
			].map((line) => fitLine(line, width));
		},
		invalidate() {},
	};
}

export function updateStatus(ctx: any, config: AssistantConfig): void {
	if (ctx.mode !== "tui" || !config.ui) return;
	const theme = ctx.ui.theme;
	const state = config.enabled ? theme.fg("success", "●") : theme.fg("dim", "○");
	const sound = config.sound ? theme.fg("accent", "♪") : theme.fg("dim", "♪");
	ctx.ui.setStatus("pi-assistant", `${state} ${theme.fg("muted", "Assistant")} ${sound}`);
}

export function updateWorkingIndicator(ctx: any, config: AssistantConfig): void {
	if (ctx.mode !== "tui") return;
	if (!config.ui) {
		ctx.ui.setWorkingIndicator?.();
		return;
	}
	const theme = ctx.ui.theme;
	ctx.ui.setWorkingIndicator?.({
		frames: [
			theme.fg("dim", "·"),
			theme.fg("muted", "•"),
			theme.fg("accent", "◆"),
			theme.fg("muted", "•"),
		],
		intervalMs: 120,
	});
}

export function helpText(command = "/assistant"): string {
	return `Uso: ${command} [on|off|toggle|status|sound|ui|help]

Perfil activo:
- ${ASSISTANT_LABEL}: asistente desarrollador de software con control humano para decisiones críticas`;
}
