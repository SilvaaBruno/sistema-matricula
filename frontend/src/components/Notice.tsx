export interface NoticeState {
  kind: 'error' | 'success';
  text: string;
}

export function Notice({ notice, onClose }: { notice: NoticeState; onClose?: () => void }) {
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      {onClose && (
        <button className="btn btn-small" onClick={onClose} aria-label="Fechar aviso">
          ×
        </button>
      )}
    </div>
  );
}
