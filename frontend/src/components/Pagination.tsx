export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Paginação">
      <button className="btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Anterior
      </button>
      <span>
        Página {page} de {pages}
      </span>
      <button className="btn" onClick={() => onChange(page + 1)} disabled={page >= pages}>
        Próxima
      </button>
    </nav>
  );
}
