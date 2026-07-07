export type SoundKind = "done" | "attention";

export function playSound(kind: SoundKind, enabled: boolean): void {
	if (!enabled) return;
	const count = kind === "attention" ? 2 : 1;
	for (let i = 0; i < count; i++) {
		setTimeout(() => process.stdout.write("\x07"), i * 140);
	}
}
