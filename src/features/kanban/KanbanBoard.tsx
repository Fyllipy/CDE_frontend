import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
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
  updateColumn
} from "../../api/kanban";
import type { KanbanCard, KanbanColumn } from "../../types/api";
import "./KanbanBoard.css";

type Props = {
  projectId: string;
  canManage: boolean;
};

type DraftMap = Record<string, string>;

const COLOR_PALETTE = ["#2563eb", "#0ea5e9", "#9333ea", "#16a34a", "#f97316", "#dc2626"];
const DEFAULT_CARD_COLOR = "#ffffff";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState(paletteColor(0));
  const [cardDraftTitles, setCardDraftTitles] = useState<DraftMap>({});
  const [cardDraftDescriptions, setCardDraftDescriptions] = useState<DraftMap>({});
  const [cardDraftColors, setCardDraftColors] = useState<DraftMap>({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const board = await fetchBoard(projectId);
        if (active) {
          setColumns(board);
          setNewColumnColor(paletteColor(board.length));
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
    const fallbackColor = columnColor(columns.find((column) => column.id === columnId) ?? { color: DEFAULT_CARD_COLOR } as KanbanColumn, 0);
    const color = cardDraftColors[columnId] || fallbackColor;
    try {
      const card = await createCard(projectId, columnId, { title, description, color });
      setColumns((current) => current.map((column) => (
        column.id === columnId ? { ...column, cards: [...column.cards, card] } : column
      )));
      setCardDraftTitles((draft) => ({ ...draft, [columnId]: "" }));
      setCardDraftDescriptions((draft) => ({ ...draft, [columnId]: "" }));
      setCardDraftColors((draft) => ({ ...draft, [columnId]: color }));
    } catch {
      setError("Nao foi possivel criar o cartao.");
    }
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
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div className="kanban-columns" ref={provided.innerRef} {...provided.droppableProps}>
                {columns.map((column, index) => {
                  const baseColor = columnColor(column, index);
                  const headerColor = lighten(baseColor, 0.85, "#f1f5f9");
                  const borderColor = lighten(baseColor, 0.75, "#cbd5f5");
                  const defaultCardColor = lighten(baseColor, 0.93, DEFAULT_CARD_COLOR);

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
                                  const cardColor = card.color && card.color.startsWith("#") ? card.color : defaultCardColor;
                                  return (
                                    <Draggable draggableId={card.id} index={cardIndex} key={card.id}>
                                      {(cardDragProvided) => (
                                        <div
                                          className="kanban-card"
                                          ref={cardDragProvided.innerRef}
                                          {...cardDragProvided.draggableProps}
                                          style={{ ...cardDragProvided.draggableProps.style, background: cardColor, borderColor }}
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
                                          <div className="card-actions">
                                            <span className="badge">Posicao {cardIndex + 1}</span>
                                            <div className="card-tools">
                                              <input
                                                type="color"
                                                className="color-input"
                                                value={card.color && card.color.startsWith("#") ? card.color : baseColor}
                                                onChange={(event) => {
                                                  const value = event.target.value || baseColor;
                                                  updateCardLocal(column.id, card.id, { color: value });
                                                  persistCard(card.id, column.id, { color: value });
                                                }}
                                              />
                                              <button className="link-button" onClick={() => handleDeleteCard(column.id, card.id)}>Remover</button>
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
                              <label className="color-picker-label">
                                Cor
                                <input
                                  type="color"
                                  className="color-input"
                                  value={cardDraftColors[column.id] || column.color || DEFAULT_CARD_COLOR}
                                  onChange={(event) => setCardDraftColors((draft) => ({ ...draft, [column.id]: event.target.value }))}
                                />
                              </label>
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
    </div>
  );
}
