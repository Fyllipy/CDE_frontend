import { useState } from 'react';
import type { FileRevision } from '../../types/api';
import './FileUploadModal.css';

type Props = {
  revision: FileRevision | null;
  author: { name: string; email: string } | null;
  open: boolean;
  onClose: () => void;
  onDownload: (revisionId: string, format: 'pdf' | 'dxf', filename: string) => Promise<void>;
  onDelete?: (revisionId: string) => Promise<boolean>;
  onUpdate?: (revisionId: string, data: { description?: string }) => Promise<void>;
  deleting: boolean;
  canDelete: boolean;
};

export function RevisionDetailsModal({ revision, author, open, onClose, onDownload, onDelete, onUpdate, deleting, canDelete }: Props) {
  if (!open || !revision) {
    return null;
  }

  const currentRevision = revision;
  const [notes, setNotes] = useState(currentRevision.description ?? '');
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

  async function handleSaveNotes() {
    if (!onUpdate) return;
    await onUpdate(currentRevision.id, { description: notes });
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
            <span className="detail-label">Nome do desenho</span>
            <span className="detail-value">{currentRevision.drawingName || '-'}</span>
          </div>
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
            <span className="detail-label">Anotações</span>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          <button className="btn" type="button" onClick={handleSaveNotes}>Salvar anotações</button>
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
