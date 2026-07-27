import { getSession } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeDteDocumentRepository } from '@/infra/container/dte';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dte/[id]/pdf — serves a single document's PDF on demand. Kept out
 * of the /sales list payload on purpose (each PDF is ~190KB base64): the
 * list only carries status/folio, and this route is what "Ver boleta" links
 * to. `findById` is org-scoped, so a cross-org id simply resolves to null.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session || !SALES_AUTHORIZED_ROLES.includes(session.role)) {
    return new Response('No autorizado', { status: 401 });
  }

  const { id } = await params;
  const document = await makeDteDocumentRepository(session.organizationId).findById(id);
  if (!document || !document.pdfBase64) {
    return new Response('Documento no encontrado', { status: 404 });
  }

  const pdf = Buffer.from(document.pdfBase64, 'base64');
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="dte-${document.folio ?? document.id}.pdf"`,
    },
  });
}
