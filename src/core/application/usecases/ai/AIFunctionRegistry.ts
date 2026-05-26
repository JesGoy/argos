import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { Message } from '@/core/domain/entities/Message';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';

export class AIFunctionRegistry {
  constructor(private readonly providers: readonly AIFunctionProvider[]) {}

  getFunctions(actor: ProductCommandActor, history: Message[]) {
    return this.providers.flatMap((provider) => provider.getFunctions(actor, history));
  }

  buildSystemPrompt(basePrompt: string): string {
    const sections = this.providers
      .map((p) => p.getSystemPromptSection?.())
      .filter((s): s is string => !!s);

    return sections.length > 0 ? `${basePrompt}\n\n${sections.join('\n\n')}` : basePrompt;
  }
}