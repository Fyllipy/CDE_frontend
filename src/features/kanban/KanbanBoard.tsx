import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  fetchBoard,
  moveCard,
  updateColumn,
  reorderCards,
  reorderColumns,
  updateCard
} from '../../api/kanban';
import type { KanbanCard, KanbanColumn } from '../../types/api';
import './KanbanBoard.css';

type Props = {
  projectId: string;
  canManage: boolean;
};

type ColumnDrafts = Record<string, string>;
const COLOR_PALETTE = ['#2563eb', '#0ea5e9', '#9333ea', '#16a34a', '#f97316', '#dc2626'];

function lighten(hex: string, factor: number): string {
  if (!hex || !hex.startsWith('#')) {
    return hex;
  }
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const num = parseInt(normalized.slice(1), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * factor + 255 * (1 - factor)));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * factor + 255 * (1 - factor)));
  const b = Math.min(255, Math.round((num & 0xff) * factor + 255 * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function nextPaletteColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

export function KanbanBoard({ projectId, canManage }: Props) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(nextPaletteColor(0));
  const [cardDrafts, setCardDrafts] = useState<ColumnDrafts>({});
  const [cardDraftDescriptions, setCardDraftDescriptions] = useState<ColumnDrafts>({});
  const [cardDraftColors, setCardDraftColors] = useState<ColumnDrafts>({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const board = await fetchBoard(projectId);
        if (active) {
          setColumns(board);
          setNewColumnColor(nextPaletteColor(board.length));
        }
      } catch (err) {
        if (active) {
          setError('Nao foi possivel carregar o quadro Kanban.');
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
    if (!newColumnName.trim()) {
      return;
    }
    try {
      const column = await createColumn(projectId, { name: newColumnName.trim(), color: newColumnColor });
      setColumns((current) => [...current, { ...column, cards: [] as KanbanCard[] }]);
      setNewColumnName('');
      setNewColumnColor(nextPaletteColor(columns.length + 1));
    } catch (err) {
      setError('Nao foi possivel criar a coluna.');
    }
  }

  async function handleAddCard(columnId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = cardDrafts[columnId];
    const description = cardDraftDescriptions[columnId] ?? '';
    const color = cardDraftColors[columnId];
    if (!title?.trim()) {
      return;
    }
    try {
      const card = await createCard(projectId, columnId, { title, description, color: color ?? null });
      setColumns((current) => current.map((column) => (
        column.id === columnId ? { ...column, cards: [...column.cards, card] } : column
      )));
      setCardDrafts((draft) => ({ ...draft, [columnId]: '' }));
      setCardDraftDescriptions((draft) => ({ ...draft, [columnId]: '' }));
      setCardDraftColors((draft) => ({ ...draft, [columnId]: '' }));
    } catch (err) {
      setError('Nao foi possivel criar o cartao.');
    }
  }

  function updateColumnLocal(columnId: string, updates: Partial<KanbanColumn>) {
    setColumns((current) => current.map((column) => (
      column.id === columnId ? { ...column, ...updates } : column
    )));
  }

  async function persistColumn(columnId: string, updates: { name?: string; color?: string }) {
    try {
      const updated = await updateColumn(projectId, columnId, updates);
      if (updated) {
        setColumns((current) => current.map((column) => (
          column.id === columnId ? { ...column, ...updated } : column
        )));
      }
    } catch (err) {
      setError('Nao foi possivel atualizar a coluna.');
    }
  }

  async function handleDeleteColumn(columnId: string) {
    await deleteColumn(projectId, columnId);
    setColumns((current) => current.filter((column) => column.id !== columnId));
  }

  function updateCardLocal(columnId: string, cardId: string, updates: Partial<KanbanCard>) {
    setColumns((current) => current.map((column) => {
      if (column.id !== columnId) {
        return column;
      }
      return {
        ...column,
        cards: column.cards.map((card) => (
          card.id === cardId ? { ...card, ...updates } : card
        ))
      };
    }));
  }

  async function persistCard(cardId: string, columnId: string, updates: { title?: string; description?: string | null; color?: string | null }) {
    try {
      const updated = await updateCard(projectId, cardId, updates);
      if (updated) {
        setColumns((current) => current.map((column) => {
          if (column.id !== columnId) {
            return column;
          }
          return {
            ...column,
            cards: column.cards.map((card) => (
              card.id === cardId ? { ...card, ...updated } : card
            ))
          };
        }));
      }
    } catch (err) {
      setError('Nao foi possivel atualizar o cartao.');
    }
  }

  async function handleDeleteCard(columnId: string, cardId: string) {
    await deleteCard(projectId, cardId);
    setColumns((current) => current.map((column) => (
      column.id === columnId ? { ...column, cards: column.cards.filter((card) => card.id !== cardId) } : column
    )));
  }

  const columnColors = useMemo(() => {
    return columns.map((column, index) => column.color ?? nextPaletteColor(index));
  }, [columns]);

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result;
    if (!destination) {
      return;
    }

    if (type === 'COLUMN') {
      if (destination.index === source.index) {
        return;
      }
      const reordered = Array.from(columns);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setColumns(reordered);
      reorderColumns(projectId, reordered.map((column) => column.id)).catch(() => setError('Falha ao reordenar colunas.'));
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

    const destinationCards = sourceColumn === destinationColumn
      ? sourceCards
      : Array.from(destinationColumn.cards);

    destinationCards.splice(destination.index, 0, movedCard);

    const updatedColumns = columns.map((column) => {
      if (column.id === sourceColumn.id) {
        return { ...column, cards: sourceColumn === destinationColumn ? destinationCards : sourceCards };
      }
      if (column.id === destinationColumn.id) {
        return { ...column, cards: destinationCards };
      }
      return column;
    });

    setColumns(updatedColumns);

    if (sourceColumn.id === destinationColumn.id) {
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartoes.'));
    } else {
      moveCard(projectId, draggableId, { toColumnId: destinationColumn.id, position: destination.index }).catch(() => setError('Falha ao mover cartao.'));
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartoes.'));
      reorderCards(projectId, sourceColumn.id, sourceCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartoes.'));
      setColumns((current) => current.map((column) => {
        if (column.id === destinationColumn.id) {
          return {
            ...column,
            cards: column.cards.map((card) => (
              card.id === draggableId ? { ...card, columnId: destinationColumn.id } : card
            ))
          };
        }
        return column;
      }));
    }
  }

  if (loading) {
    return <div className="card">Montando o quadro Kanban...</div>;
  }

  return (
    <div className="kanban">
      {error && <p className="form-error">{error}</p>}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div className="kanban-columns" ref={provided.innerRef} {...provided.droppableProps}>
              {columns.map((column, index) => (
                <Draggable draggableId={column.id} index={index} key={column.id}>
                  {(columnProvided) => {
                    const columnColor = column.color ?? columnColors[index] ?? nextPaletteColor(index);
                    const columnAccent = lighten(columnColor, 0.85);
                    return (
                      <div
                        className="kanban-column"
                        ref={columnProvided.innerRef}
                        {...columnProvided.draggableProps}
                        style={{ borderTopColor: columnColor }}
                      >
                        <div className="column-header" style={{ background: columnAccent }} {...columnProvided.dragHandleProps}>
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
                                value={columnColor}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                  const value = event.target.value;
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
                                const cardColor = card.color ?? lighten(columnColor, 0.93);
                                return (
                                  <Draggable draggableId={card.id} index={cardIndex} key={card.id}>
                                    {(cardDragProvided) => (
                                      <div
                                        className="kanban-card"
                                        ref={cardDragProvided.innerRef}
                                        {...cardDragProvided.draggableProps}
                                        {...cardDragProvided.dragHandleProps}
                                        style={{ background: cardColor, borderColor: lighten(columnColor, 0.75) }}
                                      >
                                        <textarea
                                          className="card-title"
                                          value={card.title}
                                          onChange={(event) => updateCardLocal(column.id, card.id, { title: event.target.value })}
                                          onBlur={(event) => persistCard(card.id, column.id, { title: event.target.value })}
                                        />
                                        <textarea
                                          className="card-comment"
                                          placeholder="Adicionar comentario"
                                          value={card.description ?? ''}
                                          onChange={(event) => updateCardLocal(column.id, card.id, { description: event.target.value })}
                                          onBlur={(event) => persistCard(card.id, column.id, { description: event.target.value })}
                                        />
                                        <div className="card-actions">
                                          <span className="badge">Posicao {cardIndex + 1}</span>
                                          <div className="card-tools">
                                            <input
                                              type="color"
                                              className="color-input"
                                              value={card.color ?? columnColor}
                                              onChange={(event) => {
                                                const value = event.target.value;
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
                            value={cardDrafts[column.id] ?? ''}
                            onChange={(event) => setCardDrafts((draft) => ({ ...draft, [column.id]: event.target.value }))}
                          />
                          <textarea
                            className="input"
                            placeholder="Comentario opcional"
                            value={cardDraftDescriptions[column.id] ?? ''}
                            onChange={(event) => setCardDraftDescriptions((draft) => ({ ...draft, [column.id]: event.target.value }))}
                          />
                          <div className="add-card-footer">
                            <label className="color-picker-label">
                              Cor
                              <input
                                type="color"
                                className="color-input"
                                value={cardDraftColors[column.id] ?? columnColor}
                                onChange={(event) => setCardDraftColors((draft) => ({ ...draft, [column.id]: event.target.value }))}
                              />
                            </label>
                            <button className="btn secondary" type="submit">Adicionar</button>
                          </div>
                        </form>
                      </div>
                    );
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
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
                    onChange={(event) => setNewColumnColor(event.target.value)}
                  />
                </label>
                <button className="btn secondary" type="submit">Adicionar coluna</button>
              </form>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
