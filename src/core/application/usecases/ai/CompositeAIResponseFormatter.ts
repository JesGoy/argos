import type { AIResultFormatter } from '@/core/application/usecases/ai/types';

export class CompositeAIResponseFormatter {
  constructor(private readonly formatters: readonly AIResultFormatter[]) {}

  async format(action: string, result: unknown, fallbackMessage: string) {
    const formatter = this.formatters.find((candidate) => candidate.supportsAction(action));
    if (!formatter) {
      return fallbackMessage;
    }

    return formatter.format(action, result);
  }
}