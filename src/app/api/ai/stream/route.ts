import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/app/lib/auth';
import { getOrgFormatting } from '@/app/lib/org';
import { makeProcessAICommand } from '@/infra/container/ai';
import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';
import type { ProcessAICommandOutput } from '@/core/application/usecases/ai/types';

// DB + auth cookies are required; pin to the Node.js runtime explicitly.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamRequestBody {
  conversationId?: string;
  message?: string;
}

interface DoneEventPayload {
  response: string;
  messageId: string;
  actionPerformed?: string;
  shouldRefreshUi?: boolean;
}

function sseLine(type: string, payload: object): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}

function buildDonePayload(output: ProcessAICommandOutput): DoneEventPayload {
  return {
    response: output.response,
    messageId: output.messageId,
    actionPerformed: output.actionPerformed,
    shouldRefreshUi: output.shouldRefreshUi,
  };
}

export async function POST(request: Request) {
  const session = await requireSession();
  const userId = Number(session.userId);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: AI_ASSISTANT_TEXT.INVALID_USER_ID }, { status: 400 });
  }

  let body: StreamRequestBody;
  try {
    body = (await request.json()) as StreamRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  const message = body.message?.trim();
  if (!conversationId || !message) {
    return NextResponse.json(
      { error: 'conversationId and message are required' },
      { status: 400 }
    );
  }

  const { currency } = await getOrgFormatting(session.organizationId);
  const processCommand = makeProcessAICommand(session.organizationId, currency);

  let streamingResult: Awaited<ReturnType<typeof processCommand.executeStreaming>>;
  try {
    streamingResult = await processCommand.executeStreaming({
      userId,
      userRole: session.role,
      conversationId,
      message,
    });
  } catch (error) {
    console.error('Error starting AI stream:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR,
      },
      { status: 500 }
    );
  }

  // Confirmation reply: no model invocation — return a single JSON payload.
  if (streamingResult.kind === 'sync') {
    streamingResult.output.refreshPaths.forEach((path) => revalidatePath(path));
    return NextResponse.json({
      streamed: false,
      ...buildDonePayload(streamingResult.output),
    });
  }

  const { textStream, output } = streamingResult;

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = textStream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            controller.enqueue(sseLine('text', { delta: value }));
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR;
        controller.enqueue(sseLine('error', { message: errorMessage }));
      }

      try {
        const finalOutput = await output;
        // Revalidate inside the stream lifetime so subsequent client navigation
        // sees the mutated data. `router.refresh()` on the client also fires
        // when shouldRefreshUi is true; both paths converge.
        finalOutput.refreshPaths.forEach((path) => revalidatePath(path));
        controller.enqueue(sseLine('done', buildDonePayload(finalOutput)));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR;
        controller.enqueue(sseLine('error', { message: errorMessage }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (nginx/Vercel) so deltas reach the browser.
      'X-Accel-Buffering': 'no',
    },
  });
}
