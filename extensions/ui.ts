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

function boxedLine(content: string, width: number, theme: Theme, frame = 0): string {
	const border = (text: string) => theme.fg(frame > 0 ? "borderAccent" : "borderMuted", text);
	const innerWidth = Math.max(0, width - 4);
	const fitted = fitLine(content, innerWidth);
	const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(fitted)));
	return fitLine(`${border("│")} ${fitted}${padding} ${border("│")}`, width);
}

function rgb(r: number, g: number, b: number, text: string): string {
	return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

function colorWave(text: string, offset: number): string {
	const colors = [
		[180, 190, 254],
		[203, 166, 247],
		[245, 194, 231],
		[137, 180, 250],
		[148, 226, 213],
	] as const;
	let out = "";
	let i = 0;
	for (const char of text) {
		if (char === " ") {
			out += char;
			continue;
		}
		const [r, g, b] = colors[(i + offset) % colors.length];
		out += rgb(r, g, b, char);
		i++;
	}
	return out;
}

function sparkles(frame: number): string {
	const variants = ["✦", "✧", "✶", "✧"];
	return variants[frame % variants.length];
}

export function renderHeader(config: AssistantConfig, theme: Theme, tui?: { requestRender?: () => void }) {
	let frame = 0;
	let timer: ReturnType<typeof setInterval> | undefined;
	const maxFrame = 28;

	if (tui?.requestRender) {
		timer = setInterval(() => {
			frame++;
			if (frame > maxFrame) {
				if (timer) clearInterval(timer);
				timer = undefined;
				return;
			}
			try {
				tui.requestRender?.();
			} catch {
				if (timer) clearInterval(timer);
				timer = undefined;
			}
		}, 90);
		timer.unref?.();
	}

	return {
		render(width: number): string[] {
			const lineWidth = Math.max(24, Math.min(width, 92));
			const border = (text: string) => theme.fg(frame > maxFrame ? "borderMuted" : "borderAccent", text);
			const accent = (text: string) => theme.fg("accent", text);
			const muted = (text: string) => theme.fg("muted", text);
			const dim = (text: string) => theme.fg("dim", text);
			const ok = (text: string) => theme.fg("success", text);
			const off = (text: string) => theme.fg("error", text);
			const state = config.enabled ? ok("● activo") : off("○ inactivo");
			const sound = config.sound ? ok("sonido") : dim("sonido off");
			const ui = config.ui ? ok("ui viva") : dim("ui off");
			const titleText = "Pi Assistant";
			const logo = frame <= maxFrame ? colorWave(`◈ ${titleText}`, Math.floor(frame / 2)) : accent(theme.bold(`◈ ${titleText}`));
			const pulse = frame <= maxFrame ? theme.fg(frame % 2 === 0 ? "accent" : "borderAccent", sparkles(frame)) : dim("✦");
			const title = `${pulse} ${theme.bold(logo)} ${dim("/ software developer")}`;
			const meta = `${state} ${dim("·")} ${accent(ASSISTANT_LABEL)} ${dim("·")} ${sound} ${dim("·")} ${ui}`;
			const hint = `${dim("Comandos:")} ${muted("/assistant settings")} ${dim("·")} ${muted("/assistant toggle")} ${dim("·")} ${muted("/assistant ui")}`;
			const scanWidth = Math.max(0, lineWidth - 2);
			const scanPos = frame <= maxFrame ? Math.floor((scanWidth * frame) / maxFrame) : -1;
			const top = scanPos >= 0
				? `╭${"─".repeat(Math.max(0, scanPos))}${theme.fg("accent", "◆")}${"─".repeat(Math.max(0, scanWidth - scanPos - 1))}╮`
				: `╭${"─".repeat(scanWidth)}╮`;
			return [
				"",
				border(top),
				boxedLine(title, lineWidth, theme, frame <= maxFrame ? frame : 0),
				boxedLine(meta, lineWidth, theme, frame <= maxFrame ? frame : 0),
				boxedLine(hint, lineWidth, theme, 0),
				border(`╰${"─".repeat(Math.max(0, lineWidth - 2))}╯`),
				"",
			].map((line) => fitLine(line, width));
		},
		invalidate() {
			if (timer) clearInterval(timer);
			timer = undefined;
		},
	};
}

export function updateStatus(ctx: any, config: AssistantConfig, phase: "idle" | "working" | "done" = "idle"): void {
	if (ctx.mode !== "tui") return;
	if (!config.ui) {
		ctx.ui.setStatus("pi-assistant", undefined);
		return;
	}
	const theme = ctx.ui.theme;
	const state = config.enabled ? theme.fg("success", "●") : theme.fg("dim", "○");
	const icon = phase === "working" ? theme.fg("accent", "◆") : phase === "done" ? theme.fg("success", "✓") : theme.fg("muted", "◇");
	const sound = config.sound ? theme.fg("accent", "♪") : theme.fg("dim", "♪");
	ctx.ui.setStatus("pi-assistant", `${icon} ${state} ${theme.fg("muted", "Assistant")} ${sound}`);
}

export function updateAssistantWidget(ctx: any, config: AssistantConfig): void {
	if (ctx.mode !== "tui") return;
	if (!config.ui) {
		ctx.ui.setWidget?.("pi-assistant", undefined);
		return;
	}
	ctx.ui.setWidget?.(
		"pi-assistant",
		(_tui: unknown, theme: Theme) => ({
			render(width: number): string[] {
				const left = `${theme.fg("accent", "◆")} ${theme.fg("muted", "Pi Assistant")}`;
				const enabled = config.enabled ? theme.fg("success", "ON") : theme.fg("error", "OFF");
				const sound = config.sound ? theme.fg("accent", "sound") : theme.fg("dim", "silent");
				const model = ctx.model?.id ? theme.fg("dim", `model ${ctx.model.id}`) : theme.fg("dim", "model n/a");
				const help = theme.fg("dim", "/assistant settings");
				return [fitLine(`${left} ${theme.fg("dim", "·")} ${enabled} ${theme.fg("dim", "·")} ${sound} ${theme.fg("dim", "·")} ${model} ${theme.fg("dim", "·")} ${help}`, width)];
			},
			invalidate() {},
		}),
		{ placement: "belowEditor" },
	);
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
			theme.fg("dim", "◇"),
			theme.fg("muted", "◈"),
			theme.fg("accent", "◆"),
			theme.fg("borderAccent", "◈"),
			theme.fg("muted", "◇"),
		],
		intervalMs: 110,
	});
}

export function helpText(command = "/assistant"): string {
	return `Uso: ${command} [on|off|toggle|status|sound|ui|settings|help]

Perfil activo:
- ${ASSISTANT_LABEL}: asistente desarrollador de software con control humano para decisiones críticas`;
}
