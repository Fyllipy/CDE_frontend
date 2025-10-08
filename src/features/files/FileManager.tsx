import { useEffect, useMemo, useState } from 'react';
import { downloadRevision, fetchFiles, uploadProjectFile, deleteRevision } from '../../api/files';
import type { FileEntry, FileRevision } from '../../types/api';
import { FileUploadModal } from './FileUploadModal';
import { RevisionDetailsModal } from './RevisionDetailsModal';
import './FileManager.css';

type Props = {
  projectId: string;
  namingPattern?: string;
  canUpload: boolean;
  canDelete: boolean;
  userDirectory: Record<string, { name: string; email: string }>;
};

type PatternSegment = {
  key: string;
  type: 'placeholder' | 'literal';
};

type FileRowProps = {
  file: FileEntry;
  canDelete: boolean;
  userDirectory: Record<string, { name: string; email: string }>;
  onDownload: (revisionId: string, format: 'pdf' | 'dxf', filename: string) => Promise<void>;
  onDeleteRevision: (revisionId: string) => Promise<boolean>;
  deletingRevisionId: string | null;
  onOpenRevision: (revision: FileRevision) => void;
};

type RevisionEntryProps = {
  revision: FileRevision;
  userDirectory: Record<string, { name: string; email: string }>;
  onDownload: (revisionId: string, format: 'pdf' | 'dxf', filename: string) => Promise<void>;
  onDelete?: (revisionId: string) => Promise<boolean>;
  deleting: boolean;
  onOpen: (revision: FileRevision) => void;
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

function normaliseDiscipline(value: string | undefined): string {
  if (!value) {
    return 'Outros';
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : 'Outros';
}

export function FileManager({ projectId, namingPattern, canUpload, canDelete, userDirectory }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingRevisionId, setDeletingRevisionId] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<FileRevision | null>(null);

  const segments = useMemo(() => parsePattern(namingPattern), [namingPattern]);
  const placeholderSegments = useMemo(() => segments.filter((segment) => segment.type === 'placeholder'), [segments]);
  const disciplineSegment = useMemo(() => placeholderSegments.find((segment) => /disciplina|discipline/i.test(segment.key)) ?? placeholderSegments[0], [placeholderSegments]);

  const placeholderIndex = useMemo(() => {
    const map = new Map<string, number>();
    segments.forEach((segment, index) => {
      if (segment.type === 'placeholder') {
        map.set(segment.key, index);
      }
    });
    return map;
  }, [segments]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchFiles(projectId);
        if (active) {
          setFiles(data);
        }
      } catch {
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

  async function refresh() {
    const data = await fetchFiles(projectId);
    setFiles(data);
  }

  async function handleUpload(payload: { baseName: string; pdfFile?: File | null; dxfFile?: File | null; description: string }) {
    await uploadProjectFile(projectId, payload);
    await refresh();
  }

  async function handleDownload(revisionId: string, format: 'pdf' | 'dxf', filename: string) {
    const blob = await downloadRevision(projectId, revisionId, format);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  async function handleDeleteRevision(revisionId: string): Promise<boolean> {
    if (!window.confirm('Remover esta revisao? Esta acao nao pode ser desfeita.')) {
      return false;
    }
    setDeletingRevisionId(revisionId);
    let removed = false;
    try {
      await deleteRevision(projectId, revisionId);
      await refresh();
      removed = true;
      if (selectedRevision?.id === revisionId) {
        setSelectedRevision(null);
      }
    } catch {
      setError('Nao foi possivel remover a revisao.');
    } finally {
      setDeletingRevisionId(null);
    }
    return removed;
  }

  const grouped = useMemo(() => {
    const map = new Map<string, FileEntry[]>();
    const hasPattern = Boolean(disciplineSegment && placeholderIndex.size);
    files.forEach((file) => {
      let discipline = 'Outros';
      if (hasPattern && disciplineSegment) {
        const idx = placeholderIndex.get(disciplineSegment.key);
        const parts = file.baseName.split('-');
        discipline = normaliseDiscipline(idx !== undefined ? parts[idx] : undefined);
      }
      const bucket = map.get(discipline) ?? [];
      bucket.push(file);
      map.set(discipline, bucket);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [files, disciplineSegment, placeholderIndex]);

  const totalRevisions = useMemo(() => files.reduce((acc, file) => acc + file.revisions.length, 0), [files]);
  const selectedRevisionAuthor = selectedRevision ? userDirectory[selectedRevision.uploadedById] ?? null : null;

  if (loading) {
    return <div className="card">Carregando arquivos do projeto...</div>;
  }

  return (
    <div className="file-manager card">
      <div className="file-manager-header">
        <div>
          <h3>Arquivos do projeto</h3>
          <p>{totalRevisions} revisoes registradas</p>
        </div>
        {canUpload && <button className="btn" onClick={() => setUploadOpen(true)}>Enviar arquivo</button>}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="file-groups">
        {grouped.map(([discipline, entries]) => (
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
                    <th>Revisao atual</th>
                    <th>Atualizado em</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      canDelete={canDelete}
                      userDirectory={userDirectory}
                      onDownload={handleDownload}
                      onDeleteRevision={handleDeleteRevision}
                      deletingRevisionId={deletingRevisionId}
                      onOpenRevision={(revision) => setSelectedRevision(revision)}
                    />
                  ))}
                  {!entries.length && (
                    <tr>
                      <td colSpan={4} className="empty-files">Nenhum arquivo cadastrado nesta disciplina.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {canUpload && (
        <p className="info-text">Padrao de nomenclatura ativo: <strong>{namingPattern ?? 'Nao configurado'}</strong></p>
      )}

      <FileUploadModal
        open={uploadOpen}
        namingPattern={namingPattern}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <RevisionDetailsModal
        open={Boolean(selectedRevision)}
        revision={selectedRevision}
        author={selectedRevisionAuthor}
        onClose={() => setSelectedRevision(null)}
        onDownload={handleDownload}
        onDelete={canDelete ? handleDeleteRevision : undefined}
        deleting={Boolean(selectedRevision && deletingRevisionId === selectedRevision.id)}
        canDelete={canDelete}
      />
    </div>
  );
}

function FileRow({ file, canDelete, userDirectory, onDownload, onDeleteRevision, deletingRevisionId, onOpenRevision }: FileRowProps) {
  const latestRevision = file.revisions[0];
  const latestDownload = latestRevision?.pdfOriginalFilename
    ? { format: 'pdf' as const, filename: latestRevision.pdfOriginalFilename }
    : latestRevision?.dxfOriginalFilename
      ? { format: 'dxf' as const, filename: latestRevision.dxfOriginalFilename }
      : null;

  return (
    <tr>
      <td>
        <div className="file-name">{file.baseName}.{file.extension}</div>
        <details className="revision-list">
          <summary>Historico ({file.revisions.length})</summary>
          <ul>
            {file.revisions.map((revision) => (
              <RevisionEntry
                key={revision.id}
                revision={revision}
                userDirectory={userDirectory}
                onDownload={onDownload}
                onDelete={canDelete ? onDeleteRevision : undefined}
                deleting={deletingRevisionId === revision.id}
                onOpen={onOpenRevision}
              />
            ))}
          </ul>
        </details>
      </td>
      <td>{latestRevision?.revisionLabel ?? '-'}</td>
      <td>{latestRevision ? new Date(latestRevision.createdAt).toLocaleString() : '-'}</td>
      <td className="actions-cell">
        {latestRevision && latestDownload && (
          <button
            className="btn secondary"
            onClick={() => onDownload(latestRevision.id, latestDownload.format, latestDownload.filename)}
          >
            Download {latestDownload.format.toUpperCase()}
          </button>
        )}
      </td>
    </tr>
  );
}

function RevisionEntry({ revision, userDirectory, onDownload, onDelete, deleting, onOpen }: RevisionEntryProps) {
  const author = userDirectory[revision.uploadedById];
  const displayAuthor = author?.name ?? revision.uploadedByName ?? revision.uploadedById;

  return (
    <li
      className="revision-entry"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(revision)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(revision);
        }
      }}
    >
      <span className="badge">{revision.revisionLabel}</span>
      <span>{new Date(revision.createdAt).toLocaleString()}</span>
      <span className="author">{displayAuthor}</span>
      {revision.description && <span className="description">{revision.description}</span>}
      <div className="revision-actions">
        <div className="revision-files">
          {revision.pdfOriginalFilename && (
            <button
              className="link-button"
              onClick={async (event) => {
                event.stopPropagation();
                await onDownload(revision.id, 'pdf', revision.pdfOriginalFilename!);
              }}
            >
              Baixar PDF
            </button>
          )}
          {revision.dxfOriginalFilename && (
            <button
              className="link-button"
              onClick={async (event) => {
                event.stopPropagation();
                await onDownload(revision.id, 'dxf', revision.dxfOriginalFilename!);
              }}
            >
              Baixar DXF
            </button>
          )}
          {!revision.pdfOriginalFilename && !revision.dxfOriginalFilename && (
            <span className="revision-missing">Sem arquivos</span>
          )}
        </div>
        {onDelete && (
          <button
            className="link-button danger"
            onClick={async (event) => {
              event.stopPropagation();
              await onDelete(revision.id);
            }}
            disabled={deleting}
          >
            {deleting ? 'Removendo...' : 'Remover'}
          </button>
        )}
      </div>
    </li>
  );
}
