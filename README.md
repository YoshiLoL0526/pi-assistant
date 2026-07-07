# Pi Assistant

Extensión reutilizable para Pi que convierte el agente en un asistente de programación global sin modificar `AGENTS.md` de los proyectos.

## Objetivo

El agente debe encargarse de ayudar a construir software: escribir código, leer el proyecto, hacer búsquedas, ejecutar validaciones y entregar la información relevante. El usuario conserva siempre las decisiones críticas.

Cuando una tarea sea larga, ambigua o de alto impacto, el asistente debe preguntar, proponer un roadmap y esperar confirmación antes de ejecutar cambios grandes o irreversibles.

## Qué incluye

- Identidad global inyectada en el `systemPrompt` mediante `before_agent_start`.
- Comandos `/assistant` y `/asistente`.
- Header personalizado en la TUI.
- Status line con el modo activo.
- Herramienta `ask_user` para hacer preguntas estructuradas al usuario.
- Preguntas de selección única y selección múltiple.
- Opción final para que el usuario escriba una respuesta personalizada.
- Sonido de atención cuando el asistente necesita input del usuario.
- Sonido de finalización cuando termina una respuesta.
- Reglas para resumir opciones, riesgos, recomendación y decisión requerida.

## Modos

```text
/assistant balanced   # asistente de programación equilibrado
/assistant builder    # implementación práctica
/assistant reviewer   # revisión estricta de código
/assistant architect  # arquitectura y trade-offs
/assistant mentor     # explicación técnica
/assistant concise    # respuestas mínimas
```

Alias en español:

```text
/asistente balanced
/asistente builder
```

## Herramienta `ask_user`

El asistente puede preguntar al usuario con una interfaz tipo Claude Code:

- `kind: "single"`: elegir una opción.
- `kind: "multiple"`: marcar varias opciones.
- `allowOther: true`: añade `Escribir otra respuesta` para que el usuario escriba si ninguna opción aplica.

Controles:

```text
Selección única:    ↑↓ navegar · Enter elegir · Esc cancelar
Selección múltiple: ↑↓ navegar · Espacio marcar · Enter enviar · Esc cancelar
Texto personalizado: Enter enviar texto · Esc volver
```

## Comandos

```text
/assistant status     # muestra estado actual
/assistant on         # activa el asistente global
/assistant off        # desactiva el asistente global
/assistant toggle     # alterna activación
/assistant sound      # alterna sonidos de atención/finalización
/assistant ui         # alterna header/status personalizados
/assistant help       # muestra ayuda
```

## Uso local durante desarrollo

Desde esta carpeta:

```bash
pi --extension ./extensions/assistant.ts
```

## Instalación global manual

Copia la extensión a tu carpeta global de Pi:

```bash
mkdir -p ~/.pi/agent/extensions
cp extensions/assistant.ts ~/.pi/agent/extensions/assistant.ts
```

Luego inicia Pi normalmente en cualquier proyecto:

```bash
pi
```

## Como Pi Package

Este repositorio ya incluye `package.json` con manifest `pi.extensions`. Puedes versionarlo en git y después instalarlo como paquete de Pi desde un repositorio:

```bash
pi install git:github.com/usuario/pi-assistant
```
