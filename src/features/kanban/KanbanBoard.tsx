import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import {
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  fetchBoard,
  moveCard,
  reorderCards,
  reorderColumns,
  updateCard,
  updateColumn,
  createLabel,
  fetchCardDetails,
} from "../../api/kanban";
import type { KanbanCard, KanbanColumn, KanbanLabel } from "../../types/api";
import "./KanbanBoard.css";

type Props = {
  projectId: string;
  canManage: boolean;
  userDirectory?: Record<string, { name: string; email: string }>;
};

type DraftMap = Record<string, string>;

const COLOR_PALETTE = ["#2563eb", "#0ea5e9", "#9333ea", "#16a34a", "#f97316", "#dc2626"];

function lighten(hex: string | null | undefined, factor: number, fallback = "#e2e8f0"): string {
  if (!hex || !hex.startsWith("#")) {
    return fallback;
  }
  const normalised = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const num = parseInt(normalised.slice(1), 16);
  if (Number.isNaN(num)) {
    return fallback;
  }
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * factor + 255 * (1 - factor)));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * factor + 255 * (1 - factor)));
  const b = Math.min(255, Math.round((num & 0xff) * factor + 255 * (1 - factor)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function paletteColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function columnColor(column: KanbanColumn, index: number): string {
  return column.color && column.color.startsWith("#") ? column.color : paletteColor(index);
}

export function KanbanBoard({ projectId, canManage }: Props) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [labels, setLabels] = useState<KanbanLabel[]>([]);
  const [selectedCardDetails, setSelectedCardDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState(paletteColor(0));
  const [cardDraftTitles, setCardDraftTitles] = useState<DraftMap>({});
  const [cardDraftDescriptions, setCardDraftDescriptions] = useState<DraftMap>({});
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563EB");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload = await fetchBoard(projectId);
        if (active) {
          setColumns(payload.board);
          setLabels(payload.labels ?? []);
          setNewColumnColor(paletteColor((payload.board ?? []).length));
        }
      } catch {
        if (active) {
          setError("Nao foi possivel carregar o quadro Kanban.");
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

  async function handleCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newColumnName.trim();
    if (!name) {
      return;
    }
    try {
      const column = await createColumn(projectId, { name, color: newColumnColor });
      setColumns((current) => [...current, { ...column, cards: [] as KanbanCard[] }]);
      setNewColumnName("");
      setNewColumnColor(paletteColor(columns.length + 1));
    } catch {
      setError("Nao foi possivel criar a coluna.");
    }
  }

  async function handleAddCard(columnId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = cardDraftTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    const description = cardDraftDescriptions[columnId] ?? "";
    try {
      const card = await createCard(projectId, columnId, { title, description });
      setColumns((current) => current.map((column) => (
        column.id === columnId ? { ...column, cards: [...column.cards, card] } : column
      )));
      setCardDraftTitles((draft) => ({ ...draft, [columnId]: "" }));
      setCardDraftDescriptions((draft) => ({ ...draft, [columnId]: "" }));
    } catch {
      setError("Nao foi possivel criar o cartao.");
    }
  }

  async function handleLabelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newLabelName.trim();
    if (!name) {
      return;
    }
    try {
      const label = await createLabel(projectId, { name, color: newLabelColor });
      setLabels((curr) => [...curr, label]);
      setNewLabelName("");
    } catch {
      setError('Nao foi possivel criar a etiqueta. Verifique suas permissoes.');
    }
  }

  async function openCardDetails(cardId: string) {
    try {
      const details = await fetchCardDetails(projectId, cardId);
      setSelectedCardDetails(details);
    } catch {
      setError('Nao foi possivel carregar os detalhes do cartao.');
    }
  }

  function closeCardDetails() {
    setSelectedCardDetails(null);
  }

  function handleCardClick(cardId: string, event: MouseEvent<HTMLDivElement>) {
    const element = event.target as HTMLElement | null;
    if (element?.closest("textarea, button, input, a")) {
      return;
    }
    openCardDetails(cardId);
  }

  function updateColumnLocal(columnId: string, data: Partial<KanbanColumn>) {
    setColumns((current) => current.map((column) => (column.id === columnId ? { ...column, ...data } : column)));
  }

  async function persistColumn(columnId: string, data: { name?: string; color?: string }) {
    try {
      const updated = await updateColumn(projectId, columnId, data);
      if (updated) {
        setColumns((current) => current.map((column) => (column.id === columnId ? { ...column, ...updated } : column)));
      }
    } catch {
      setError("Nao foi possivel atualizar a coluna.");
    }
  }

  async function handleDeleteColumn(columnId: string) {
    await deleteColumn(projectId, columnId);
    setColumns((current) => current.filter((column) => column.id !== columnId));
  }

  function updateCardLocal(columnId: string, cardId: string, data: Partial<KanbanCard>) {
    setColumns((current) => current.map((column) => {
      if (column.id !== columnId) {
        return column;
      }
      return {
        ...column,
        cards: column.cards.map((card) => (card.id === cardId ? { ...card, ...data } : card))
      };
    }));
  }

  async function persistCard(cardId: string, columnId: string, data: { title?: string; description?: string | null; color?: string | null }) {
    try {
      const updated = await updateCard(projectId, cardId, data);
      if (updated) {
        setColumns((current) => current.map((column) => {
          if (column.id !== columnId) {
            return column;
          }
          return {
            ...column,
            cards: column.cards.map((card) => (card.id === cardId ? { ...card, ...updated } : card))
          };
        }));
      }
    } catch {
      setError("Nao foi possivel atualizar o cartao.");
    }
  }

  async function handleDeleteCard(columnId: string, cardId: string) {
    await deleteCard(projectId, cardId);
    setColumns((current) => current.map((column) => (
      column.id === columnId ? { ...column, cards: column.cards.filter((card) => card.id !== cardId) } : column
    )));
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) {
      return;
    }

    if (type === "COLUMN") {
      if (destination.index === source.index) {
        return;
      }
      const reordered = Array.from(columns);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setColumns(reordered);
      reorderColumns(projectId, reordered.map((column) => column.id)).catch(() => setError("Falha ao reordenar colunas."));
      return;
    }

    const sourceColumn = columns.find((column) => column.id === source.droppableId);
    const destinationColumn = columns.find((column) => column.id === destination.droppableId);
    if (!sourceColumn || !destinationColumn) {
      return;
    }

    const sourceCards = Array.from(sourceColumn.cards);
    const [movedCard] = sourceCards.splice(source.index, 1);
    if (!movedCard) {
      return;
    }

    const destinationCards = sourceColumn.id === destinationColumn.id
      ? sourceCards
      : Array.from(destinationColumn.cards);

    destinationCards.splice(destination.index, 0, movedCard);

    setColumns((current) => current.map((column) => {
      if (column.id === sourceColumn.id) {
        return { ...column, cards: sourceColumn.id === destinationColumn.id ? destinationCards : sourceCards };
      }
      if (column.id === destinationColumn.id) {
        return { ...column, cards: destinationCards };
      }
      return column;
    }));

    if (sourceColumn.id === destinationColumn.id) {
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError("Falha ao reordenar cartoes."));
    } else {
      moveCard(projectId, draggableId, { toColumnId: destinationColumn.id, position: destination.index }).catch(() => setError("Falha ao mover cartao."));
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError("Falha ao reordenar cartoes."));
      reorderCards(projectId, sourceColumn.id, sourceCards.map((card) => card.id)).catch(() => setError("Falha ao reordenar cartoes."));
    }
  }

  if (loading) {
    return <div className="card">Montando o quadro Kanban...</div>;
  }

  return (
    <div className="kanban">
      {error && <p className="form-error">{error}</p>}
      <div className="kanban-toolbar">
        <section className="labels-panel">
          <div className="labels-panel-header">
            <h3>Etiquetas do projeto</h3>
            <p className="labels-panel-subtitle">Use cores para destacar tipos de tarefa.</p>
          </div>
          <div className="labels-list">
            {labels.length === 0 && <span className="muted">Nenhuma etiqueta cadastrada ainda.</span>}
            {labels.map((label) => (
              <span key={label.id} className="label-chip" style={{ background: label.color }}>
                {label.name}
              </span>
            ))}
          </div>
          {canManage && (
            <form className="label-form" onSubmit={handleLabelSubmit}>
              <input
                className="input"
                placeholder="Nome da etiqueta"
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
              />
              <label className="label-color-picker">
                Cor
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(event) => setNewLabelColor(event.target.value || "#2563EB")}
                />
              </label>
              <button className="btn secondary" type="submit">Criar etiqueta</button>
            </form>
          )}
        </section>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div className="kanban-columns" ref={provided.innerRef} {...provided.droppableProps}>
                {columns.map((column, index) => {
                  const baseColor = columnColor(column, index);
                  const headerColor = lighten(baseColor, 0.85, "#f1f5f9");
                  const cardBackground = "#e9e9e9ff";
                  const cardBorderColor = "#e2e8f0";

                  return (
                    <Draggable draggableId={column.id} index={index} key={column.id}>
                      {(columnProvided) => (
                        <div
                          className="kanban-column"
                          ref={columnProvided.innerRef}
                          {...columnProvided.draggableProps}
                          style={{ ...columnProvided.draggableProps.style, borderTopColor: baseColor }}
                        >
                          <div className="column-header" style={{ background: headerColor }} {...columnProvided.dragHandleProps}>
                            <input
                              className="column-title"
                              value={column.name}
                              onChange={(event) => updateColumnLocal(column.id, { name: event.target.value })}
                              onBlur={(event) => persistColumn(column.id, { name: event.target.value.trim() || column.name })}
                              disabled={!canManage}
                            />
                            {canManage && (
                              <div className="column-tools">
                                <input
                                  className="color-input"
                                  type="color"
                                  value={baseColor}
                                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                    const value = event.target.value || paletteColor(index);
                                    updateColumnLocal(column.id, { color: value });
                                    persistColumn(column.id, { color: value });
                                  }}
                                />
                                <button className="link-button" onClick={() => handleDeleteColumn(column.id)}>Excluir</button>
                              </div>
                            )}
                          </div>
                          <Droppable droppableId={column.id} type="CARD">
                            {(cardProvided) => (
                              <div className="card-stack" ref={cardProvided.innerRef} {...cardProvided.droppableProps}>
                                {column.cards.map((card, cardIndex) => {
                                  return (
                                    <Draggable draggableId={card.id} index={cardIndex} key={card.id}>
                                      {(cardDragProvided) => (
                                        <div
                                          className="kanban-card"
                                          ref={cardDragProvided.innerRef}
                                          {...cardDragProvided.draggableProps}
                                          style={{ ...cardDragProvided.draggableProps.style, background: cardBackground, borderColor: cardBorderColor }}
                                          onClick={(event) => handleCardClick(card.id, event)}
                                        >
                                          <div className="card-handle" {...cardDragProvided.dragHandleProps}>
                                            <span className="grip" aria-hidden="true">: :</span>
                                          </div>
                                          <textarea
                                            className="card-title"
                                            value={card.title}
                                            onChange={(event) => updateCardLocal(column.id, card.id, { title: event.target.value })}
                                            onBlur={(event) => persistCard(card.id, column.id, { title: event.target.value })}
                                          />
                                          <textarea
                                            className="card-comment"
                                            placeholder="Adicionar comentario"
                                            value={card.description ?? ""}
                                            onChange={(event) => updateCardLocal(column.id, card.id, { description: event.target.value })}
                                            onBlur={(event) => persistCard(card.id, column.id, { description: event.target.value })}
                                          />
                                          <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                            <span className="badge" onClick={(event) => event.stopPropagation()}>Posicao {cardIndex + 1}</span>
                                            <span className="badge" onClick={(event) => event.stopPropagation()}>Etiquetas: {card.labels ? card.labels.length : 0}</span>
                                            <span className="badge" onClick={(event) => event.stopPropagation()}>Atribuidos: {card.assignees ? card.assignees.length : 0}</span>
                                            <div className="card-tools" onClick={(event) => event.stopPropagation()}>
                                              <button
                                                className="link-button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleDeleteCard(column.id, card.id);
                                                }}
                                              >
                                                Remover
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {cardProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <form className="add-card" onSubmit={(event) => handleAddCard(column.id, event)}>
                            <input
                              className="input"
                              placeholder="Nova tarefa"
                              value={cardDraftTitles[column.id] ?? ""}
                              onChange={(event) => setCardDraftTitles((draft) => ({ ...draft, [column.id]: event.target.value }))}
                            />
                            <textarea
                              className="input"
                              placeholder="Comentario opcional"
                              value={cardDraftDescriptions[column.id] ?? ""}
                              onChange={(event) => setCardDraftDescriptions((draft) => ({ ...draft, [column.id]: event.target.value }))}
                            />
                            <div className="add-card-footer">
                              <button className="btn secondary" type="submit">Adicionar</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <form className="new-column" onSubmit={handleCreateColumn}>
            <input
              className="input"
              placeholder="Nova coluna"
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
            />
            <label className="color-picker-label">
              Cor
              <input
                className="color-input"
                type="color"
                value={newColumnColor}
                onChange={(event) => setNewColumnColor(event.target.value || paletteColor(columns.length))}
              />
            </label>
            <button className="btn secondary" type="submit">Adicionar coluna</button>
          </form>
        </div>
      </DragDropContext>
      {selectedCardDetails && (
        <div className="card-details-modal">
          <div className="card-details">
            <h3>{selectedCardDetails.title}</h3>
            <p>{selectedCardDetails.description}</p>
            <div>
              <h4>Comentarios</h4>
              {selectedCardDetails.comments?.map((c: any) => (
                <div key={c.id} className="comment">
                  <strong>{c.authorName ?? c.authorId}</strong>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
            <div>
              <h4>Atividade</h4>
              {selectedCardDetails.activity?.map((a: any) => (
                <div key={a.id} className="activity">
                  <small>{a.type} - {new Date(a.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn" onClick={closeCardDetails}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
