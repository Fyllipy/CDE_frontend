import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./FileUploadModal.css";

type Props = {
  open: boolean;
  namingPattern?: string;
  onClose: () => void;
  onUpload: (payload: { baseName: string; pdfFile?: File | null; dxfFile?: File | null; description: string; drawingName?: string }) => Promise<void>;
};

type PatternSegment = {
  key: string;
  label: string;
  type: "placeholder" | "literal";
};

function parsePattern(pattern?: string): PatternSegment[] {
  if (!pattern) {
    return [];
  }
  return pattern.split("-").map((segment) => {
    if (segment.startsWith("{") && segment.endsWith("}")) {
      const key = segment.slice(1, -1);
      return {
        key,
        label: key.replace(/([A-Z])/g, " $1").replace(/^[a-z]/, (char) => char.toUpperCase()),
        type: "placeholder" as const
      };
    }
    return {
      key: segment,
      label: segment,
      type: "literal" as const
    };
  });
}

export function FileUploadModal({ open, namingPattern, onClose, onUpload }: Props) {
  const patternSegments = useMemo(() => parsePattern(namingPattern), [namingPattern]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [drawingName, setDrawingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const composedBaseName = useMemo(() => {
    if (!patternSegments.length) {
      return "";
    }
    return patternSegments
      .map((segment) => {
        if (segment.type === "literal") {
          return segment.key;
        }
        return values[segment.key]?.trim() ?? "";
      })
      .join("-");
  }, [patternSegments, values]);

  const placeholdersValid = useMemo(() => {
    if (!patternSegments.length) {
      return true;
    }
    return patternSegments
      .filter((segment) => segment.type === "placeholder")
      .every((segment) => Boolean(values[segment.key]?.trim()));
  }, [patternSegments, values]);

  const selectionBaseName = useMemo(() => {
    const source = pdfFile ?? dxfFile;
    if (!source) {
      return "";
    }
    return source.name.replace(/\.[^.]+$/, "");
  }, [pdfFile, dxfFile]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pdfFile && !dxfFile) {
      setError("Selecione ao menos um arquivo PDF ou DXF.");
      return;
    }
    if (!placeholdersValid) {
      setError("Preencha o padrao de nomenclatura conforme configurado.");
      return;
    }

    if (pdfFile && !/\.pdf$/i.test(pdfFile.name)) {
      setError("O arquivo PDF deve possuir extensao .pdf.");
      return;
    }
    if (dxfFile && !/\.dxf$/i.test(dxfFile.name)) {
      setError("O arquivo DXF deve possuir extensao .dxf.");
      return;
    }

    const baseName = patternSegments.length ? composedBaseName.trim() : selectionBaseName.trim();
    if (!baseName) {
      setError("Nao foi possivel determinar o nome base do arquivo.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onUpload({
        baseName,
        pdfFile,
        dxfFile,
        description: description.trim(),
        drawingName: drawingName.trim() || undefined
      });
      setValues({});
      setPdfFile(null);
      setDxfFile(null);
      setDrawingName("");
      setDescription("");
      onClose();
    } catch (err) {
      setError("Falha ao realizar upload. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Novo upload</h3>
          <button className="close-button" onClick={onClose} aria-label="Fechar modal">&times;</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="file-pdf">Arquivo PDF (opcional)</label>
            <input
              id="file-pdf"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                setPdfFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="file-dxf">Arquivo DXF (opcional)</label>
            <input
              id="file-dxf"
              type="file"
              accept=".dxf,application/dxf,application/x-dxf"
              onChange={(event) => {
                setDxfFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>

          <p className="hint">Envie ao menos um arquivo. Quando possivel, anexe PDF e DXF.</p>

          {patternSegments.length > 0 && (
            <div className="pattern-builder">
              <p className="pattern-info">Preencha o padrao configurado para o projeto:</p>
              <div className="pattern-grid">
                {patternSegments.map((segment) => (
                  segment.type === "placeholder" ? (
                    <div className="field" key={segment.key}>
                      <label className="label" htmlFor={`segment-${segment.key}`}>{segment.label}</label>
                      <input
                        id={`segment-${segment.key}`}
                        className="input"
                        value={values[segment.key] ?? ""}
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
                <span>Pre-visualizacao:</span>
                <strong>{composedBaseName || selectionBaseName || '...'}</strong>
              </div>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="drawing-name">Nome do desenho</label>
            <input
              id="drawing-name"
              className="input"
              placeholder="Ex.: Planta de forma - pav. tipo"
              value={drawingName}
              onChange={(e) => setDrawingName(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="revision-description">Descricao da revisao</label>
            <textarea
              id="revision-description"
              className="input"
              rows={3}
              placeholder="Notas relevantes sobre esta revisao"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

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
