import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { Type } from "typebox";

type AssistantMode = "balanced" | "builder" | "reviewer" | "architect" | "mentor" | "concise";
type QuestionKind = "single" | "multiple";

type AssistantConfig = {
	enabled: boolean;
	mode: AssistantMode;
	sound: boolean;
	ui: boolean;
};

type AskOption = {
	label: string;
	value?: string;
	description?: string;
};

type DisplayOption = AskOption & { isOther?: boolean };

type AskUserDetails = {
	kind: QuestionKind;
	question: string;
	options: string[];
	answers: string[];
	customAnswers: string[];
	cancelled: boolean;
};

const MODES: Record<AssistantMode, { label: string; instructions: string }> = {
	balanced: {
		label: "Coding Assistant",
		instructions: `Modo general equilibrado.
- Escribe código cuando sea necesario, investiga el proyecto y entrega información accionable.
- Combina ejecución práctica con contexto suficiente para que el usuario decida.
- Sé directo, técnico y orientado a resultados.`,
	},
	builder: {
		label: "Builder",
		instructions: `Modo implementación.
- Prioriza avanzar con cambios concretos, pequeños y verificables.
- Lee el contexto antes de editar.
- Después de cambiar código, resume archivos tocados, validaciones realizadas y pendientes.`,
	},
	reviewer: {
		label: "Code Reviewer",
		instructions: `Modo revisión.
- Busca bugs, regresiones, edge cases, problemas de seguridad y deuda técnica.
- Separa hallazgos bloqueantes, recomendaciones y preferencias.
- Propón correcciones concretas y verificables.`,
	},
	architect: {
		label: "Architect",
		instructions: `Modo arquitectura.
- Evalúa diseño, acoplamiento, límites de módulos, mantenibilidad y coste de cambio.
- Expón trade-offs y riesgos.
- Recomienda una opción, pero deja claro qué decisión crítica debe tomar el usuario.`,
	},
	mentor: {
		label: "Mentor",
		instructions: `Modo mentor técnico.
- Explica el razonamiento detrás de las decisiones.
- Usa ejemplos breves cuando ayuden.
- Corrige malentendidos con claridad y precisión.`,
	},
	concise: {
		label: "Concise",
		instructions: `Modo conciso.
- Responde con el mínimo texto útil.
- Evita explicaciones largas salvo que el usuario las pida.
- Mantén siempre el resumen de decisión cuando haya alternativas o riesgos.`,
	},
};

const config: AssistantConfig = {
	enabled: true,
	mode: "balanced",
	sound: true,
	ui: true,
};

const AskOptionSchema = Type.Object({
	label: Type.String({ description: "Texto visible de la opción" }),
	value: Type.Optional(Type.String({ description: "Valor interno opcional; si falta, se usa label" })),
	description: Type.Optional(Type.String({ description: "Descripción corta de la opción" })),
});

const AskUserParams = Type.Object({
	kind: Type.Union([Type.Literal("single"), Type.Literal("multiple")], {
		description: "single para elegir una opción; multiple para marcar varias",
	}),
	question: Type.String({ description: "Pregunta clara para el usuario" }),
	options: Type.Array(AskOptionSchema, { description: "Opciones sugeridas para el usuario" }),
	allowOther: Type.Optional(Type.Boolean({ description: "Añadir opción para que el usuario escriba otra respuesta. Default: true" })),
});

function assistantInstructions(): string {
	const mode = MODES[config.mode];
	return `\n\n# Identidad global del asistente de programación\n\nLa identidad global del asistente está activa. Modo actual: ${mode.label}.\n\n## Rol\nEres un asistente de programación. Tu trabajo es ayudar a construir software: leer código, investigar, escribir cambios, ejecutar validaciones, explicar hallazgos y entregar la información relevante para que el usuario tome decisiones.\n\nEl usuario siempre conserva las decisiones críticas. No tomes decisiones de producto, arquitectura irreversible, seguridad, borrado de datos, cambios destructivos, cambios amplios de dependencias o migraciones riesgosas sin exponer opciones y pedir confirmación.\n\n## Preguntas al usuario\nCuando necesites una decisión o aclaración, usa la herramienta ask_user en vez de hacer una pregunta abierta dentro de la respuesta normal.\n- Usa kind=\"single\" cuando el usuario deba elegir una opción.\n- Usa kind=\"multiple\" cuando el usuario pueda marcar varias opciones.\n- Incluye siempre opciones razonables y deja allowOther=true salvo que sea estrictamente necesario impedir respuestas personalizadas.\n- Formula preguntas concretas, con opciones accionables y descripciones breves cuando aporten contexto.\n\n## Comportamiento base\n- Responde en español salvo que el usuario pida otro idioma.\n- Sé proactivo investigando con herramientas cuando falte contexto técnico.\n- Si la tarea es pequeña y segura, ejecútala directamente.\n- Si la tarea es ambigua, pregunta lo mínimo necesario antes de actuar.\n- Si detectas riesgos, supuestos o trade-offs, hazlos visibles.\n- Prefiere soluciones simples, mantenibles, verificables y reversibles.\n- Usa rutas claras al hablar de archivos.\n- No ocultes incertidumbre: distingue hechos, inferencias y recomendaciones.\n\n## Tareas largas o complejas\nCuando la tarea sea larga, ambigua, multiarchivo, de arquitectura, migración o alto impacto:\n1. Resume tu entendimiento del objetivo.\n2. Haz preguntas críticas si faltan requisitos usando ask_user.\n3. Propón un roadmap breve por fases.\n4. Indica riesgos y puntos donde el usuario debe decidir.\n5. Espera confirmación antes de ejecutar cambios grandes o irreversibles.\n\n## Formato de respuesta para decisiones\nCuando haya alternativas, riesgos o decisiones del usuario, termina con un resumen útil para decidir:\n- Estado: qué se sabe o qué se hizo.\n- Opciones: alternativas reales, si aplican.\n- Recomendación: qué harías y por qué.\n- Decisión requerida: qué debe aprobar o elegir el usuario.\n\n## Modo actual\n${mode.instructions}\n`;
}

function renderHeader(theme: Theme) {
	return {
		render(_width: number): string[] {
			const accent = (text: string) => theme.fg("accent", text);
			const dim = (text: string) => theme.fg("dim", text);
			const success = (text: string) => theme.fg("success", text);
			const state = config.enabled ? success("ON") : theme.fg("error", "OFF");
			const mode = MODES[config.mode].label;
			return [
				"",
				`${accent("◈ Pi Assistant")} ${dim("— asistente de programación reutilizable")}`,
				`${dim("Modo:")} ${accent(mode)}  ${dim("Estado:")} ${state}  ${dim("Comando:")} /assistant`,
				"",
			];
		},
		invalidate() {},
	};
}

function playSound(kind: "done" | "attention"): void {
	if (!config.sound) return;
	const count = kind === "attention" ? 2 : 1;
	for (let i = 0; i < count; i++) {
		setTimeout(() => process.stdout.write("\x07"), i * 140);
	}
}

function updateStatus(ctx: any): void {
	if (ctx.mode !== "tui" || !config.ui) return;
	const theme = ctx.ui.theme;
	const state = config.enabled ? theme.fg("success", "●") : theme.fg("dim", "○");
	ctx.ui.setStatus("pi-assistant", `${state} ${theme.fg("dim", MODES[config.mode].label)}`);
}

function helpText(command = "/assistant"): string {
	return `Uso: ${command} [on|off|toggle|status|sound|ui|balanced|builder|reviewer|architect|mentor|concise]

Modos disponibles:
- balanced: asistente de programación equilibrado
- builder: implementación práctica
- reviewer: revisión estricta de código
- architect: arquitectura y trade-offs
- mentor: explicación técnica
- concise: respuestas mínimas`;
}

function createCommandHandler(command: string) {
	return async (args: string, ctx: any) => {
		const arg = args.trim().toLowerCase();
		if (!arg || arg === "status") {
			ctx.ui.notify(
				`Assistant ${config.enabled ? "activo" : "inactivo"}. Modo: ${MODES[config.mode].label}. Sonido: ${config.sound ? "on" : "off"}. UI: ${config.ui ? "on" : "off"}.`,
				"info",
			);
			updateStatus(ctx);
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
		} else if (arg in MODES) {
			config.mode = arg as AssistantMode;
			config.enabled = true;
		} else {
			ctx.ui.notify(helpText(command), "warning");
			return;
		}
		if (ctx.mode === "tui" && config.ui) ctx.ui.setHeader((_tui: unknown, theme: Theme) => renderHeader(theme));
		updateStatus(ctx);
		ctx.ui.notify(`Assistant: ${config.enabled ? "ON" : "OFF"} · ${MODES[config.mode].label}`, "info");
	};
}

function registerAskUserTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Ask the user a structured question. Supports single-choice and multiple-choice questions, always with an optional custom answer when allowOther is true. Use when user input or approval is needed.",
		parameters: AskUserParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const allowOther = params.allowOther !== false;
			const options: DisplayOption[] = [...params.options];
			if (allowOther) options.push({ label: "Escribir otra respuesta", value: "__other__", isOther: true });
			const optionLabels = params.options.map((o) => o.label);

			if (ctx.mode !== "tui") {
				return {
					content: [{ type: "text", text: "Error: UI no disponible para preguntar al usuario en modo no interactivo" }],
					details: { kind: params.kind, question: params.question, options: optionLabels, answers: [], customAnswers: [], cancelled: true } as AskUserDetails,
				};
			}
			if (options.length === 0) {
				return {
					content: [{ type: "text", text: "Error: no se proporcionaron opciones" }],
					details: { kind: params.kind, question: params.question, options: [], answers: [], customAnswers: [], cancelled: true } as AskUserDetails,
				};
			}

			playSound("attention");
			ctx.ui.notify("El asistente necesita tu decisión", "info");

			const result = await ctx.ui.custom<{ answers: string[]; customAnswers: string[] } | null>((tui, theme, _kb, done) => {
				let optionIndex = 0;
				let editMode = false;
				let cachedLines: string[] | undefined;
				const selected = new Set<number>();
				const customAnswers: string[] = [];

				const editorTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function answerForOption(opt: DisplayOption): string {
					return opt.value && opt.value !== "__other__" ? opt.value : opt.label;
				}

				function submitMultiple() {
					const answers = Array.from(selected).map((i) => answerForOption(options[i]));
					done({ answers: [...answers, ...customAnswers], customAnswers });
				}

				editor.onSubmit = (value) => {
					const trimmed = value.trim();
					if (!trimmed) {
						editMode = false;
						editor.setText("");
						refresh();
						return;
					}
					if (params.kind === "single") {
						done({ answers: [trimmed], customAnswers: [trimmed] });
						return;
					}
					customAnswers.push(trimmed);
					editMode = false;
					editor.setText("");
					refresh();
				};

				function handleInput(data: string) {
					if (editMode) {
						if (matchesKey(data, Key.escape)) {
							editMode = false;
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}
					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(options.length - 1, optionIndex + 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.escape)) {
						done(null);
						return;
					}
					if (matchesKey(data, Key.space) && params.kind === "multiple") {
						const opt = options[optionIndex];
						if (opt.isOther) editMode = true;
						else if (selected.has(optionIndex)) selected.delete(optionIndex);
						else selected.add(optionIndex);
						refresh();
						return;
					}
					if (matchesKey(data, Key.enter)) {
						const opt = options[optionIndex];
						if (opt.isOther) {
							editMode = true;
							refresh();
							return;
						}
						if (params.kind === "single") done({ answers: [answerForOption(opt)], customAnswers: [] });
						else if (selected.size > 0 || customAnswers.length > 0) submitMultiple();
						else {
							selected.add(optionIndex);
							submitMultiple();
						}
					}
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;
					const lines: string[] = [];
					const renderWidth = Math.max(1, width);
					function addWrapped(text: string) { lines.push(...wrapTextWithAnsi(text, renderWidth)); }
					function addWrappedWithPrefix(prefix: string, text: string) {
						const prefixWidth = visibleWidth(prefix);
						if (prefixWidth >= renderWidth) return addWrapped(prefix + text);
						const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
						const continuationPrefix = " ".repeat(prefixWidth);
						for (let i = 0; i < wrapped.length; i++) lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
					}

					lines.push(theme.fg("accent", "─".repeat(renderWidth)));
					addWrappedWithPrefix(" ", theme.fg("accent", params.kind === "multiple" ? "Decisión múltiple" : "Decisión requerida"));
					addWrappedWithPrefix(" ", theme.fg("text", params.question));
					lines.push("");
					for (let i = 0; i < options.length; i++) {
						const opt = options[i];
						const isSelected = selected.has(i);
						const cursor = i === optionIndex ? theme.fg("accent", "> ") : "  ";
						const mark = params.kind === "multiple" ? (isSelected ? theme.fg("success", "[x] ") : theme.fg("dim", "[ ] ")) : "";
						const label = `${i + 1}. ${opt.label}${opt.isOther && editMode ? " ✎" : ""}`;
						const color = i === optionIndex || isSelected ? "accent" : "text";
						addWrappedWithPrefix(cursor + mark, theme.fg(color, label));
						if (opt.description) addWrappedWithPrefix("     ", theme.fg("muted", opt.description));
					}
					if (customAnswers.length > 0) {
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("muted", `Respuestas escritas: ${customAnswers.join(", ")}`));
					}
					if (editMode) {
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("muted", "Tu respuesta:"));
						for (const line of editor.render(Math.max(1, renderWidth - 2))) lines.push(` ${line}`);
					}
					lines.push("");
					const help = editMode
						? "Enter enviar texto • Esc volver"
						: params.kind === "multiple"
							? "↑↓ navegar • Espacio marcar • Enter enviar • Esc cancelar"
							: "↑↓ navegar • Enter elegir • Esc cancelar";
					addWrappedWithPrefix(" ", theme.fg("dim", help));
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));
					cachedLines = lines;
					return lines;
				}
				return { render, invalidate: () => { cachedLines = undefined; }, handleInput };
			});

			if (!result) {
				return {
					content: [{ type: "text", text: "El usuario canceló la pregunta" }],
					details: { kind: params.kind, question: params.question, options: optionLabels, answers: [], customAnswers: [], cancelled: true } as AskUserDetails,
				};
			}
			return {
				content: [{ type: "text", text: `Respuesta del usuario: ${result.answers.join(", ")}` }],
				details: { kind: params.kind, question: params.question, options: optionLabels, answers: result.answers, customAnswers: result.customAnswers, cancelled: false } as AskUserDetails,
			};
		},
		renderCall(args, theme) {
			const kind = args.kind === "multiple" ? "multiple" : "single";
			const opts = Array.isArray(args.options) ? args.options.map((o: AskOption) => o.label).join(", ") : "";
			let text = theme.fg("toolTitle", theme.bold("ask_user ")) + theme.fg("muted", `${kind}: ${args.question}`);
			if (opts) text += `\n${theme.fg("dim", `  Opciones: ${opts}, Escribir otra respuesta`)}`;
			return new Text(text, 0, 0);
		},
		renderResult(result, _options, theme) {
			const details = result.details as AskUserDetails | undefined;
			if (!details) return new Text(result.content[0]?.type === "text" ? result.content[0].text : "", 0, 0);
			if (details.cancelled) return new Text(theme.fg("warning", "Cancelado"), 0, 0);
			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", details.answers.join(", ")), 0, 0);
		},
	});
}

export default function assistantExtension(pi: ExtensionAPI) {
	registerAskUserTool(pi);
	pi.registerCommand("assistant", { description: "Controla el asistente de programación global", handler: createCommandHandler("/assistant") });
	pi.registerCommand("asistente", { description: "Alias en español de /assistant", handler: createCommandHandler("/asistente") });
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode === "tui" && config.ui) {
			ctx.ui.setHeader((_tui, theme) => renderHeader(theme));
			updateStatus(ctx);
		}
	});
	pi.on("before_agent_start", async (event) => {
		if (!config.enabled) return undefined;
		return { systemPrompt: event.systemPrompt + assistantInstructions() };
	});
	pi.on("agent_start", async (_event, ctx) => updateStatus(ctx));
	pi.on("agent_end", async (_event, ctx) => {
		updateStatus(ctx);
		playSound("done");
	});
}
