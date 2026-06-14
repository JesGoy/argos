import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Base path without the page query (e.g. "/sales"). */
  basePath: string;
  /** Extra query params to preserve across page links. */
  extraParams?: Record<string, string | undefined>;
}

function buildHref(basePath: string, page: number, extraParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }
  params.set('page', String(page));
  return `${basePath}?${params.toString()}`;
}

/**
 * Link-based pagination (no client JS): works inside server components that
 * read `page` from searchParams.
 */
export function Pagination({ currentPage, totalPages, basePath, extraParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const baseBtn =
    'inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors';
  const enabled = 'border-gray-300 text-gray-700 hover:bg-gray-100';
  const disabled = 'border-gray-200 text-gray-400 cursor-not-allowed pointer-events-none';

  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Paginación">
      <Link
        href={hasPrev ? buildHref(basePath, currentPage - 1, extraParams) : '#'}
        aria-disabled={!hasPrev}
        className={`${baseBtn} ${hasPrev ? enabled : disabled}`}
      >
        ← Anterior
      </Link>
      <span className="text-sm text-gray-600">
        Página {currentPage} de {totalPages}
      </span>
      <Link
        href={hasNext ? buildHref(basePath, currentPage + 1, extraParams) : '#'}
        aria-disabled={!hasNext}
        className={`${baseBtn} ${hasNext ? enabled : disabled}`}
      >
        Siguiente →
      </Link>
    </nav>
  );
}
