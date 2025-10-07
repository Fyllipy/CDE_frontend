import { useEffect, useMemo, useState } from 'react';
import type { GeneralDocument } from '../../types/api';
import {
  deleteGeneralDocument,
  downloadGeneralDocument,
  fetchGeneralDocuments,
  generalDocCategories,
  uploadGeneralDocument
} from '../../api/generalDocuments';
import { GeneralDocumentUploadModal } from './GeneralDocumentUploadModal';
import './GeneralDocumentsPanel.css';

type Props = {
  projectId: string;
  canUpload: boolean;
  canDelete: boolean;
  userDirectory: Record<string, { name: string; email: string }>;
};

type CategoryKey = (typeof generalDocCategories)[number];
type DocumentMap = Record<CategoryKey, GeneralDocument[]>;

function createEmptyMap(): DocumentMap {
  return {
    photos: [],
    documents: [],
    received: [],
    others: []
  };
}

const categoryLabels: Record<CategoryKey, string> = {
  photos: 'Fotos',
  documents: 'Documentos',
  received: 'Documentos recebidos',
  others: 'Outros'
};

function normalizeDocuments(raw: Record<string, GeneralDocument[]>): DocumentMap {
  const normalized: DocumentMap = createEmptyMap();
  generalDocCategories.forEach((category) => {
    normalized[category] = [...(raw[category] ?? [])];
  });
  return normalized;
}

export function GeneralDocumentsPanel({ projectId, canUpload, canDelete, userDirectory }: Props) {
  const [documents, setDocuments] = useState<DocumentMap>(createEmptyMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalDocuments = useMemo(
    () => generalDocCategories.reduce((total, category) => total + (documents[category]?.length ?? 0), 0),
    [documents]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchGeneralDocuments(projectId);
        if (active) {
          setDocuments(normalizeDocuments(data));
          setError(null);
        }
      } catch {
        if (active) {
          setError('Nao foi possivel carregar os documentos gerais.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [projectId]);

  async function refresh() {
    const data = await fetchGeneralDocuments(projectId);
    setDocuments(normalizeDocuments(data));
  }

  async function handleUpload(file: File, category: CategoryKey, description: string) {
    setError(null);
    try {
      await uploadGeneralDocument(projectId, file, category, description);
      await refresh();
    } catch (err) {
      setError('Nao foi possivel enviar o documento.');
      throw err;
    }
  }

  async function handleDelete(documentId: string) {
    if (!window.confirm('Remover este documento? Esta acao nao pode ser desfeita.')) {
      return;
    }
    setError(null);
    setDeletingId(documentId);
    try {
      await deleteGeneralDocument(projectId, documentId);
      await refresh();
    } catch {
      setError('Nao foi possivel remover o documento.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(documentId: string, filename: string) {
    const blob = await downloadGeneralDocument(projectId, documentId);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function resolveAuthorName(userId: string): string {
    const user = userDirectory[userId];
    return user?.name ?? userId;
  }

  return (
    <div className="general-documents card">
      <header className="general-documents-header">
        <div>
          <h3>Documentos gerais</h3>
          <p>Centralize materiais como fotos, comunicados e arquivos recebidos.</p>
          <span className="badge">{totalDocuments} documento(s)</span>
        </div>
        {canUpload && (
          <button className="btn" onClick={() => setUploadOpen(true)}>
            Novo upload
          </button>
        )}
      </header>

      {loading && <p>Carregando documentos...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && (
        <div className="general-document-groups">
          {generalDocCategories.map((category) => {
            const items = documents[category] ?? [];
            return (
              <section className="general-document-group" key={category}>
                <header className="general-document-group-header">
                  <div>
                    <h4>{categoryLabels[category]}</h4>
                    <span className="badge">{items.length} documento(s)</span>
                  </div>
                </header>

                {items.length ? (
                  <ul className="general-document-list">
                    {items.map((doc) => (
                      <li className="general-document-item" key={doc.id}>
                        <div className="general-document-details">
                          <span className="general-document-name">{doc.originalFilename}</span>
                          {doc.description && (
                            <span className="general-document-description">{doc.description}</span>
                          )}
                          <div className="general-document-meta">
                            <span>Enviado por: {resolveAuthorName(doc.uploadedById)}</span>
                            <span>{new Date(doc.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="general-document-actions">
                          <button
                            className="btn secondary"
                            onClick={() => handleDownload(doc.id, doc.originalFilename)}
                          >
                            Baixar
                          </button>
                          {canDelete && (
                            <button
                              className="btn danger"
                              onClick={() => handleDelete(doc.id)}
                              disabled={deletingId === doc.id}
                            >
                              {deletingId === doc.id ? 'Removendo...' : 'Remover'}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="general-document-empty">Nenhum documento nesta categoria.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <GeneralDocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
