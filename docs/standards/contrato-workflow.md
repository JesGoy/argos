# Contrato operativo del proyecto — bloque `workflow` de `visebit.json`

**Versión**: 1.0 · **Aplica desde**: estándar 1.8.0

## Por qué existe

El estándar de Visebit define *qué* construir bien. Este contrato define *cómo se trabaja en este repo concreto*: de qué rama nacen las tareas, con qué comando se corren los tests, dónde vive cada capa.

Visebit tiene un repo por cliente y varios stacks. Una skill que hardcodea `pnpm test` sirve en un proyecto y miente en el siguiente. Con este contrato, **la misma skill funciona igual en todos** porque lo variable lo aporta el proyecto, no la skill.

Regla de oro para decidir si algo va en este bloque: **si una skill necesita saberlo para no adivinar, y cambia de un proyecto a otro, va en `workflow`.** Si es una regla de cómo escribir código, va en el estándar o en el anexo de stack. Si es dominio de negocio, va en `CLAUDE.md`. Si describe **con qué versión del estándar se juzga este repo y si debe moverse**, va en el bloque `standard` — ver `contrato-estandar.md`.

## Cómo lo consumen las skills

Todas las skills del ecosistema leen, en este orden, antes de actuar:

1. `visebit.json` → `standard` (con qué versión se juzga este repo — ver `contrato-estandar.md`)
2. `visebit.json` → `workflow` (este contrato)
3. `docs/standards/` (estándar base + anexo de stack)
4. `CLAUDE.md` (dominio y decisiones propias)

**Ningún campo es obligatorio.** Un campo ausente o `null` no rompe la skill: la degrada de forma explícita. La regla dura es que la skill **dice en voz alta que lo dedujo**, nunca lo asume en silencio. La tabla de degradación de cada campo está más abajo.

---

## Campos

### `ticketing`

```jsonc
"ticketing": {
  "provider": "jira",                                   // jira | github | linear | ninguno
  "keys": ["MUV"],                                      // prefijos válidos de ticket
  "urlPattern": "https://visebit.atlassian.net/browse/{key}"
}
```

| Campo | Qué es |
|---|---|
| `provider` | Cómo se leen las tareas. `ninguno` = se trabaja desde una descripción en texto libre |
| `keys` | Prefijos aceptados (`MUV-123`). Vacío con `provider` distinto de `ninguno` = se acepta cualquier `^[A-Z]+-\d+$` |
| `urlPattern` | Para enlazar el ticket en planes e informes. `{key}` se reemplaza por el ticket |

**Degradación**: sin ticketing o si el proveedor no responde, `visebit-start-task` pide una descripción de la tarea y genera el slug desde ahí; el plan queda marcado como *sin ticket*. Nunca aborta por esto ni pide tokens al usuario.

### `branches`

```jsonc
"branches": {
  "base": "qa",                                          // de dónde nacen las features
  "hotfixBase": "main",                                  // de dónde nacen los fixes
  "prefixes": { "bug": "bugfix", "default": "feature" }
}
```

El prefijo sale del **tipo de tarea**, no del criterio del agente: un bug se corrige sobre lo que ya está desplegado (`hotfixBase`), una feature se construye sobre la base de integración (`base`). Si el tipo no matchea ninguna clave, manda `default`.

**Degradación**: sin el bloque, la skill deduce la base del repo (`git symbolic-ref refs/remotes/origin/HEAD`) y lo declara en la confirmación antes de crear nada.

### `worktrees`

```jsonc
"worktrees": {
  "enabled": true,
  "path": "../muvacom-worktrees",
  "copyOnCreate": [".env", ".env.local"],   // lo que git no materializa
  "postCreate": ["pnpm install"]            // lo que hay que correr para que levante
}
```

`enabled: false` (por defecto) = una rama por tarea en el mismo directorio, sin worktree.

Prenderlo tiene sentido cuando se trabajan dos tareas en paralelo y el costo de reconstruir dependencias es bajo o el ambiente es Docker. En un monorepo pnpm con `node_modules` pesado, cada worktree es un `install` completo: evalúalo antes de prenderlo.

`copyOnCreate` es crítico y se olvida siempre: `git worktree add` solo materializa archivos **trackeados**. Sin el `.env`, el worktree no levanta.

**Degradación**: sin el bloque, no se crea worktree.

### `commands`

```jsonc
"commands": {
  "dev": "pnpm dev",
  "build": "pnpm build",
  "test": "pnpm test",
  "lint": "pnpm lint",
  "typecheck": "pnpm typecheck",
  "migrate": "pnpm db:migrate"
}
```

Los comandos **reales** del repo, leídos de `package.json`/manifiesto, no los que deberían existir. En un monorepo, si un comando solo aplica a un paquete, escribe el comando completo (`pnpm --filter storefront test`).

**Degradación**: un comando `null` significa "este proyecto no lo tiene". La skill lo reporta como *no verificado* en vez de inventar uno. Nunca ejecuta un comando que no esté declarado en el contrato.

### `layers`

```jsonc
"layers": [
  { "glob": "apps/backend/src/modules/**",  "layer": "dominio" },
  { "glob": "apps/backend/src/workflows/**","layer": "aplicacion" },
  { "glob": "apps/backend/src/api/**",      "layer": "presentacion" },
  { "glob": "apps/storefront/src/modules/**","layer": "presentacion" }
]
```

Traduce la estructura real del repo a las capas del estándar (§2): `dominio`, `aplicacion`, `infraestructura`, `presentacion`. Es lo que permite que `visebit-code-review` diga *"esto es lógica de negocio en capa de presentación"* con la ruta concreta, y que `visebit-test-plan` sepa qué casos borde aplican.

Un `layer` fuera de esos cuatro valores se acepta y se trata como capa propia del proyecto (útil en stacks donde la Clean Architecture completa no aplica, ej. `astro-landing`).

**Degradación**: sin `layers`, la revisión evalúa capas por criterio general y **lo dice en el reporte**; los hallazgos de arquitectura bajan de bloqueante a advertencia, porque no hay mapa contra el cual afirmar.

### `ignoreInReview`

Globs de ruido: lockfiles, `dist/`, código generado, snapshots. No se revisan y se listan como excluidos en el reporte — un recorte silencioso se lee como "esto es todo".

**Excepción**: si aparece un artefacto generado en el diff **sin** su fuente, eso sí es hallazgo (build commiteado suelto).

---

## Mantenerlo vivo

- Se actualiza en el **mismo commit** que cambia lo que describe (un script nuevo en `package.json`, una carpeta que se mueve).
- Si una skill tuvo que deducir un campo y acertó, ese campo faltaba: agrégalo.
- `visebit-code-review` marca como advertencia un `workflow` que contradice el repo (un comando declarado que no existe en `package.json`).
