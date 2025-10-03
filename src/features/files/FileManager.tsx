import { useEffect, useMemo, useState } from 'react';
import { downloadRevision, fetchFiles, uploadProjectFile } from '../../api/files';
import type { FileEntry } from '../../types/api';
import { FileUploadModal } from './FileUploadModal';
import './FileManager.css';

type Props = {
  projectId: string;
  namingPattern?: string;
  canUpload: boolean;
  userDirectory: Record<string, { name: string; email: string }>;
};

export function FileManager({ projectId, namingPattern, canUpload, userDirectory }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchFiles(projectId);
        if (active) {
          setFiles(data);
        }
      } catch (err) {
        if (active) {
          setError('Não foi possível carregar os arquivos.');
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

  async function refreshFiles() {
    const data = await fetchFiles(projectId);
    setFiles(data);
  }

  async function handleUpload(file: File, composedName: string) {
    await uploadProjectFile(projectId, file, composedName);
    await refreshFiles();
  }

  async function handleDownload(revisionId: string, originalName: string) {
    const blob = await downloadRevision(projectId, revisionId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  const flattenedRevisions = useMemo(
    () => files.reduce((acc, file) => acc + file.revisions.length, 0),
    [files]
  );

  if (loading) {
    return <div className="card">Carregando arquivos do projeto...</div>;
  }

  return (
    <div className="file-manager card">
      <div className="file-manager-header">
        <div>
          <h3>Arquivos do projeto</h3>
          <p>{flattenedRevisions} revisões registradas</p>
        </div>
        {canUpload && (
          <button className="btn" onClick={() => setUploadOpen(true)}>Enviar arquivo</button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="file-list">
        <table className="table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Revisão Atual</th>
              <th>Atualizado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const latestRevision = file.revisions[0];
              return (
                <tr key={file.id}>
                  <td>
                    <div className="file-name">{file.baseName}.{file.extension}</div>
                    <details className="revision-list">
                      <summary>Histórico ({file.revisions.length})</summary>
                      <ul>
                        {file.revisions.map((revision) => {
                          const author = userDirectory[revision.uploadedById];
                          return (
                            <li key={revision.id}>
                              <span className="badge">{revision.revisionLabel}</span>
                              <span>{new Date(revision.createdAt).toLocaleString()}</span>
                              <span className="author">{author ? author.name : revision.uploadedByName ?? revision.uploadedById}</span>
                              <button
                                className="link-button"
                                onClick={() => handleDownload(revision.id, revision.originalFilename)}
                              >
                                Baixar
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </td>
                  <td>{latestRevision?.revisionLabel ?? '-'}</td>
                  <td>{latestRevision ? new Date(latestRevision.createdAt).toLocaleString() : '-'}</td>
                  <td>
                    {latestRevision && (
                      <button
                        className="btn secondary"
                        onClick={() => handleDownload(latestRevision.id, latestRevision.originalFilename)}
                      >
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!files.length && (
              <tr>
                <td colSpan={4} className="empty-files">
                  Nenhum arquivo foi cadastrado até o momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canUpload && (
        <p className="info-text">Padrão de nomenclatura ativo: <strong>{namingPattern ?? 'Não configurado'}</strong></p>
      )}

      <FileUploadModal
        open={uploadOpen}
        namingPattern={namingPattern}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
