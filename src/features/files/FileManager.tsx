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

type PatternSegment = {
  key: string;
  type: 'placeholder' | 'literal';
};

function parsePattern(pattern?: string): PatternSegment[] {
  if (!pattern) {
    return [];
  }
  return pattern.split('-').map((segment) => {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      return { key: segment.slice(1, -1), type: 'placeholder' as const };
    }
    return { key: segment, type: 'literal' as const };
  });
}

function normaliseDisciplineLabel(value: string | undefined): string {
  if (!value) {
    return 'Outros';
  }
  return value.trim() || 'Outros';
}

export function FileManager({ projectId, namingPattern, canUpload, userDirectory }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const patternSegments = useMemo(() => parsePattern(namingPattern), [namingPattern]);
  const placeholderSegments = useMemo(() => patternSegments.filter((segment) => segment.type === 'placeholder'), [patternSegments]);
  const disciplineSegment = useMemo(() => {
    return placeholderSegments.find((segment) => /disciplina|discipline/i.test(segment.key)) ?? placeholderSegments[0];
  }, [placeholderSegments]);

  const placeholderIndices = useMemo(() => {
    const indexMap = new Map<string, number>();
    patternSegments.forEach((segment, index) => {
      if (segment.type === 'placeholder') {
        indexMap.set(segment.key, index);
      }
    });
    return indexMap;
  }, [patternSegments]);

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
          setError('Nao foi possivel carregar os arquivos.');
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

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, FileEntry[]>();
    const hasPattern = Boolean(disciplineSegment && placeholderIndices.size);
    files.forEach((file) => {
      let discipline = 'Outros';
      if (hasPattern && disciplineSegment) {
        const pieces = file.baseName.split('-');
        const index = placeholderIndices.get(disciplineSegment.key);
        discipline = normaliseDisciplineLabel(index !== undefined ? pieces[index] : undefined);
      }
      const list = groups.get(discipline) ?? [];
      list.push(file);
      groups.set(discipline, list);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [files, disciplineSegment, placeholderIndices]);

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

      <div className="file-groups">
        {groupedFiles.map(([discipline, entries]) => (
          <section className="file-group" key={discipline}>
            <header className="file-group-header">
              <h4>{discipline}</h4>
              <span className="badge">{entries.length} documento(s)</span>
            </header>
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
                  {entries.map((file) => {
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
                                const displayAuthor = author?.name ?? revision.uploadedByName ?? revision.uploadedById;
                                return (
                                  <li key={revision.id}>
                                    <span className="badge">{revision.revisionLabel}</span>
                                    <span>{new Date(revision.createdAt).toLocaleString()}</span>
                                    <span className="author">{displayAuthor}</span>
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
                  {!entries.length && (
                    <tr>
                      <td colSpan={4} className="empty-files">
                        Nenhum arquivo cadastrado nesta disciplina.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
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
