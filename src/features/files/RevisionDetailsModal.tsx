import type { FileRevision } from '../../types/api';
import './FileUploadModal.css';

type Props = {
  revision: FileRevision | null;
  author: { name: string; email: string } | null;
  open: boolean;
  onClose: () => void;
  onDownload: (revisionId: string, format: 'pdf' | 'dxf', filename: string) => Promise<void>;
  onDelete?: (revisionId: string) => Promise<boolean>;
  deleting: boolean;
  canDelete: boolean;
};

export function RevisionDetailsModal({ revision, author, open, onClose, onDownload, onDelete, deleting, canDelete }: Props) {
  if (!open || !revision) {
    return null;
  }

  const currentRevision = revision;
  const displayName = author?.name ?? currentRevision.uploadedByName ?? currentRevision.uploadedById;
  const displayEmail = author?.email ?? currentRevision.uploadedByEmail ?? '';

  async function handleDownload(format: 'pdf' | 'dxf', filename: string) {
    await onDownload(currentRevision.id, format, filename);
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }
    const removed = await onDelete(currentRevision.id);
    if (removed) {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card revision-modal">
        <div className="modal-header">
          <h3>Detalhes da revisao {currentRevision.revisionLabel}</h3>
          <button className="close-button" onClick={onClose} aria-label="Fechar modal">&times;</button>
        </div>
        <div className="modal-body revision-modal-body">
          <div className="revision-detail">
            <span className="detail-label">Arquivo</span>
            <div className="detail-value file-list">
              {currentRevision.pdfOriginalFilename && <span>PDF: {currentRevision.pdfOriginalFilename}</span>}
              {currentRevision.dxfOriginalFilename && <span>DXF: {currentRevision.dxfOriginalFilename}</span>}
              {!currentRevision.pdfOriginalFilename && !currentRevision.dxfOriginalFilename && <span>Sem arquivos anexados.</span>}
            </div>
          </div>
          <div className="revision-detail">
            <span className="detail-label">Enviado por</span>
            <span className="detail-value">
              {displayName}
              {displayEmail ? ` (${displayEmail})` : ''}
            </span>
          </div>
          <div className="revision-detail">
            <span className="detail-label">Data de upload</span>
            <span className="detail-value">{new Date(currentRevision.createdAt).toLocaleString()}</span>
          </div>
          <div className="revision-detail">
            <span className="detail-label">Descricao</span>
            <span className="detail-value">{currentRevision.description?.trim() || 'Sem descricao registrada.'}</span>
          </div>
        </div>
        <div className="modal-footer revision-modal-footer">
          <div className="revision-modal-actions">
            {currentRevision.pdfOriginalFilename && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => handleDownload('pdf', currentRevision.pdfOriginalFilename!)}
              >
                Baixar PDF
              </button>
            )}
            {currentRevision.dxfOriginalFilename && (
              <button
                className="btn secondary"
                type="button"
                onClick={() => handleDownload('dxf', currentRevision.dxfOriginalFilename!)}
              >
                Baixar DXF
              </button>
            )}
          </div>
          {canDelete && onDelete && (
            <button className="btn danger" type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removendo...' : 'Remover revisao'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
