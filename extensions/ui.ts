import { ASSISTANT_LABEL } from "./profile.ts";

export function helpText(command = "/assistant"): string {
	return `Uso: ${command} [on|off|toggle|status|sound|config-path|help]

Comandos:
- ${command} status: muestra el estado actual
- ${command} on/off/toggle: activa, desactiva o alterna la identidad global
- ${command} sound: activa o desactiva avisos sonoros
- ${command} config-path: muestra dónde se guarda la configuración

Perfil activo:
- ${ASSISTANT_LABEL}: asistente desarrollador de software con control humano para decisiones críticas`;
}
