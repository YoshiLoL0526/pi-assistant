import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { AssistantConfig } from "./types.ts";

const CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-assistant.json");

const DEFAULT_CONFIG: AssistantConfig = {
	enabled: true,
	sound: true,
};

function normalizeConfig(value: unknown): AssistantConfig {
	const raw = value && typeof value === "object" ? value as Partial<AssistantConfig> : {};
	return {
		enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CONFIG.enabled,
		sound: typeof raw.sound === "boolean" ? raw.sound : DEFAULT_CONFIG.sound,
	};
}

function loadConfig(): AssistantConfig {
	try {
		if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
		return normalizeConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(current: AssistantConfig = config): boolean {
	try {
		mkdirSync(dirname(CONFIG_PATH), { recursive: true });
		writeFileSync(CONFIG_PATH, `${JSON.stringify(current, null, 2)}\n`, "utf8");
		return true;
	} catch {
		return false;
	}
}

export function configPath(): string {
	return CONFIG_PATH;
}

export const config: AssistantConfig = loadConfig();
