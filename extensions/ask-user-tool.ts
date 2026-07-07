import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import type { AskOption, AskUserDetails, DisplayOption } from "./types.ts";

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

export function registerAskUserTool(pi: ExtensionAPI, onAttention: () => void) {
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

			onAttention();
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
