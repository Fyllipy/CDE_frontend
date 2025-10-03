import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './FileUploadModal.css';

type Props = {
  open: boolean;
  namingPattern?: string;
  onClose: () => void;
  onUpload: (file: File, composedName: string) => Promise<void>;
};

type PatternSegment = {
  key: string;
  label: string;
  type: 'placeholder' | 'literal';
};

function parsePattern(pattern?: string): PatternSegment[] {
  if (!pattern) {
    return [];
  }
  return pattern.split('-').map((segment) => {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      const key = segment.slice(1, -1);
      return {
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, (char) => char.toUpperCase()),
        type: 'placeholder' as const
      };
    }
    return {
      key: segment,
      label: segment,
      type: 'literal' as const
    };
  });
}

export function FileUploadModal({ open, namingPattern, onClose, onUpload }: Props) {
  const patternSegments = useMemo(() => parsePattern(namingPattern), [namingPattern]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const composedBaseName = useMemo(() => {
    if (!patternSegments.length) {
      return '';
    }
    return patternSegments
      .map((segment) => {
        if (segment.type === 'literal') {
          return segment.key;
        }
        return values[segment.key]?.trim() ?? '';
      })
      .join('-');
  }, [patternSegments, values]);

  const placeholdersValid = useMemo(() => {
    if (!patternSegments.length) {
      return true;
    }
    return patternSegments
      .filter((segment) => segment.type === 'placeholder')
      .every((segment) => Boolean(values[segment.key]?.trim()));
  }, [patternSegments, values]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError('Selecione um arquivo valido.');
      return;
    }
    if (!placeholdersValid) {
      setError('Preencha o padrao de nomenclatura conforme configurado.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const extension = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop() ?? '' : '';
      const baseName = patternSegments.length ? composedBaseName : selectedFile.name.replace(/\.[^.]+$/, '');
      const finalName = extension ? `${baseName}.${extension}` : baseName;
      await onUpload(selectedFile, finalName);
      setValues({});
      setSelectedFile(null);
      onClose();
    } catch (err) {
      setError('Falha ao realizar upload. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Novo upload</h3>
          <button className="close-button" onClick={onClose} aria-label="Fechar modal">�</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="file-input">Selecionar arquivo</label>
            <input
              id="file-input"
              type="file"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
              required
            />
          </div>

          {patternSegments.length > 0 && (
            <div className="pattern-builder">
              <p className="pattern-info">Preencha o padrão configurado para o projeto:</p>
              <div className="pattern-grid">
                {patternSegments.map((segment) => (
                  segment.type === 'placeholder' ? (
                    <div className="field" key={segment.key}>
                      <label className="label" htmlFor={`segment-${segment.key}`}>{segment.label}</label>
                      <input
                        id={`segment-${segment.key}`}
                        className="input"
                        value={values[segment.key] ?? ''}
                        onChange={(event) => setValues((current) => ({ ...current, [segment.key]: event.target.value }))}
                        required
                      />
                    </div>
                  ) : (
                    <div className="literal" key={segment.key}>{segment.key}</div>
                  )
                ))}
              </div>
              <div className="preview">
                <span>Pré-visualizacao:</span>
                <strong>{composedBaseName || '...'}</strong>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
