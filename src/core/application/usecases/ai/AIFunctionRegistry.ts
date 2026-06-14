import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { Message } from '@/core/domain/entities/Message';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import { USER_ROLE_LABELS } from '@/core/domain/constants/UserConstants';

export class AIFunctionRegistry {
  constructor(private readonly providers: readonly AIFunctionProvider[]) {}

  getFunctions(actor: ProductCommandActor, history: Message[]) {
    return this.providers.flatMap((provider) => provider.getFunctions(actor, history));
  }

  buildSystemPrompt(basePrompt: string, actor?: ProductCommandActor): string {
    const sections = this.providers
      .map((p) => p.getSystemPromptSection?.())
      .filter((s): s is string => !!s);

    if (actor) {
      const label = USER_ROLE_LABELS[actor.role] ?? actor.role;
      // The available tools are already filtered by role, but tell the model so
      // it doesn't offer or promise actions this user can't perform.
      sections.push(
        `## Usuario actual:\nRol: ${label} (${actor.role}). Solo dispones de las herramientas permitidas para este rol; si el usuario pide algo fuera de sus permisos, explícale brevemente que no está disponible para su rol en lugar de intentarlo.`
      );
    }

    return sections.length > 0 ? `${basePrompt}\n\n${sections.join('\n\n')}` : basePrompt;
  }
}
