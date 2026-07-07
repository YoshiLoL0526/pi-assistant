import type { Theme } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { AssistantConfig } from "./types.ts";
import { saveConfig } from "./config.ts";
import { ASSISTANT_LABEL } from "./profile.ts";
import { helpText, renderHeader, updateAssistantWidget, updateStatus, updateWorkingIndicator } from "./ui.ts";

type SettingId = "enabled" | "sound" | "ui" | "style" | "status" | "help" | "close";

interface SettingItem {
	id: SettingId;
	label: string;
	description: string;
}

const ITEMS: SettingItem[] = [
	{ id: "enabled", label: "Assistant global", description: "Inyecta el perfil de desarrollador en cada ejecución del agente" },
	{ id: "sound", label: "Sonidos", description: "Avisos de atención y finalización" },
	{ id: "ui", label: "UI personalizada", description: "Header, status line y spinner premium" },
	{ id: "style", label: "Estilo visual", description: "Cambia entre animated, minimal y quiet" },
	{ id: "status", label: "Mostrar estado", description: "Publica un resumen rápido en la UI" },
	{ id: "help", label: "Ayuda", description: "Muestra comandos disponibles" },
	{ id: "close", label: "Cerrar", description: "Vuelve al chat" },
];

function valueFor(item: SettingItem, config: AssistantConfig): string {
	if (item.id === "enabled") return config.enabled ? "ON" : "OFF";
	if (item.id === "sound") return config.sound ? "ON" : "OFF";
	if (item.id === "ui") return config.ui ? "ON" : "OFF";
	if (item.id === "style") return config.uiStyle;
	return "";
}

function applyUi(ctx: any, config: AssistantConfig): void {
	if (ctx.mode !== "tui") return;
	if (config.ui) ctx.ui.setHeader(config.uiStyle === "quiet" ? undefined : (tui: any, theme: Theme) => renderHeader(config, theme, tui));
	else {
		ctx.ui.setHeader(undefined);
		ctx.ui.setStatus("pi-assistant", undefined);
	}
	updateStatus(ctx, config);
	updateAssistantWidget(ctx, config);
	updateWorkingIndicator(ctx, config);
}

export async function openSettingsPanel(ctx: any, command: string, config: AssistantConfig): Promise<void> {
	if (ctx.mode !== "tui") {
		ctx.ui.notify(helpText(command), "info");
		return;
	}

	await ctx.ui.custom<void>((tui: any, theme: Theme, _kb: unknown, done: () => void) => {
		let selected = 0;
		let cachedWidth: number | undefined;
		let cachedLines: string[] | undefined;

		function refresh(): void {
			cachedWidth = undefined;
			cachedLines = undefined;
			tui.requestRender();
		}

		function toggle(item: SettingItem): void {
			if (item.id === "enabled") config.enabled = !config.enabled;
			else if (item.id === "sound") config.sound = !config.sound;
			else if (item.id === "ui") config.ui = !config.ui;
			else if (item.id === "style") {
				const styles = ["animated", "minimal", "quiet"] as const;
				config.uiStyle = styles[(styles.indexOf(config.uiStyle) + 1) % styles.length];
				config.ui = true;
			}
			else if (item.id === "status") ctx.ui.notify(`Assistant ${config.enabled ? "activo" : "inactivo"}. Perfil: ${ASSISTANT_LABEL}. Sonido: ${config.sound ? "on" : "off"}. UI: ${config.ui ? "on" : "off"}. Estilo: ${config.uiStyle}.`, "info");
			else if (item.id === "help") ctx.ui.notify(helpText(command), "info");
			else if (item.id === "close") {
				done();
				return;
			}
			const saved = saveConfig(config);
			if (!saved) ctx.ui.notify("No se pudo guardar la configuración de Pi Assistant", "warning");
			applyUi(ctx, config);
			refresh();
		}

		function handleInput(data: string): void {
			if (matchesKey(data, Key.up)) selected = Math.max(0, selected - 1);
			else if (matchesKey(data, Key.down)) selected = Math.min(ITEMS.length - 1, selected + 1);
			else if (matchesKey(data, Key.escape)) return done();
			else if (matchesKey(data, Key.enter) || matchesKey(data, Key.space)) return toggle(ITEMS[selected]);
			else return;
			refresh();
		}

		function render(width: number): string[] {
			if (cachedLines && cachedWidth === width) return cachedLines;
			const w = Math.max(32, Math.min(width, 86));
			const border = (s: string) => theme.fg("borderAccent", s);
			const muted = (s: string) => theme.fg("muted", s);
			const dim = (s: string) => theme.fg("dim", s);
			const accent = (s: string) => theme.fg("accent", s);
			const ok = (s: string) => theme.fg("success", s);
			const off = (s: string) => theme.fg("dim", s);
			const line = border("─".repeat(w));
			const lines = [line, ` ${accent(theme.bold("Assistant Settings"))} ${dim("·")} ${muted(ASSISTANT_LABEL)}`, ""];

			for (let i = 0; i < ITEMS.length; i++) {
				const item = ITEMS[i];
				const isSelected = i === selected;
				const prefix = isSelected ? accent("› ") : dim("  ");
				const value = valueFor(item, config);
				const valueText = value ? (value === "ON" || value === "animated" ? ok(value) : value === "quiet" ? off(value) : accent(value)) : "";
				const label = isSelected ? accent(item.label) : theme.fg("text", item.label);
				const spacer = value ? " ".repeat(Math.max(1, w - 6 - item.label.length - value.length)) : "";
				lines.push(truncateToWidth(`${prefix}${label}${spacer}${valueText}`, width));
				lines.push(truncateToWidth(`    ${dim(item.description)}`, width));
			}

			lines.push("", ` ${dim("↑↓ navegar · Enter/Espacio alternar · Esc cerrar")}`, line);
			cachedWidth = width;
			cachedLines = lines.map((l) => truncateToWidth(l, width));
			return cachedLines;
		}

		return { render, invalidate: () => { cachedWidth = undefined; cachedLines = undefined; }, handleInput };
	});
	applyUi(ctx, config);
}
