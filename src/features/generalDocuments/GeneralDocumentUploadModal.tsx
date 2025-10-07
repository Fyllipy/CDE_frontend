import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { generalDocCategories } from '../../api/generalDocuments';
import '../files/FileUploadModal.css';

type CategoryKey = (typeof generalDocCategories)[number];

type Props = {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, category: CategoryKey, description: string) => Promise<void>;
};

const categoryLabels: Record<CategoryKey, string> = {
  photos: 'Fotos',
  documents: 'Documentos',
  received: 'Documentos recebidos',
  others: 'Outros'
};

export function GeneralDocumentUploadModal({ open, onClose, onUpload }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<CategoryKey>(generalDocCategories[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setCategory(generalDocCategories[0]);
      setDescription('');
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError('Selecione um arquivo valido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onUpload(selectedFile, category, description.trim());
      onClose();
    } catch {
      setError('Falha ao realizar upload. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Novo documento geral</h3>
          <button className="close-button" onClick={onClose} aria-label="Fechar modal">
            &times;
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="general-doc-file">
              Selecionar arquivo
            </label>
            <input
              id="general-doc-file"
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="general-doc-category">
              Categoria
            </label>
            <select
              id="general-doc-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryKey)}
            >
              {generalDocCategories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="general-doc-description">
              Observacoes
            </label>
            <textarea
              id="general-doc-description"
              className="input"
              rows={3}
              placeholder="Notas sobre o documento (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button className="btn secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Salvar documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
