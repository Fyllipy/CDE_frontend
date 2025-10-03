import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createCard,
  createColumn,
  deleteCard,
  deleteColumn,
  fetchBoard,
  moveCard,
  renameColumn,
  reorderCards,
  reorderColumns,
  updateCard
} from '../../api/kanban';
import type { KanbanColumn } from '../../types/api';
import './KanbanBoard.css';

type Props = {
  projectId: string;
  canManage: boolean;
};

type ColumnDrafts = Record<string, string>;

export function KanbanBoard({ projectId, canManage }: Props) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [cardDrafts, setCardDrafts] = useState<ColumnDrafts>({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const board = await fetchBoard(projectId);
        if (active) {
          setColumns(board);
        }
      } catch (err) {
        if (active) {
          setError('Não foi possível carregar o quadro Kanban.');
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
      const column = await createColumn(projectId, newColumnName.trim());
      setColumns((current) => [...current, { ...column, cards: [] }]);
      setNewColumnName('');
    } catch (err) {
      setError('Não foi possível criar a coluna.');
    }
  }

  async function handleAddCard(columnId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = cardDrafts[columnId];
    if (!title?.trim()) {
      return;
    }
    try {
      const card = await createCard(projectId, columnId, { title });
      setColumns((current) => current.map((column) => (
        column.id === columnId ? { ...column, cards: [...column.cards, card] } : column
      )));
      setCardDrafts((draft) => ({ ...draft, [columnId]: '' }));
    } catch (err) {
      setError('Não foi possível criar o cartão.');
    }
  }

  async function handleRenameColumn(columnId: string, name: string) {
    await renameColumn(projectId, columnId, name);
    setColumns((current) => current.map((column) => (
      column.id === columnId ? { ...column, name } : column
    )));
  }

  async function handleDeleteColumn(columnId: string) {
    await deleteColumn(projectId, columnId);
    setColumns((current) => current.filter((column) => column.id !== columnId));
  }

  async function handleDeleteCard(columnId: string, cardId: string) {
    await deleteCard(projectId, cardId);
    setColumns((current) => current.map((column) => (
      column.id === columnId ? { ...column, cards: column.cards.filter((card) => card.id !== cardId) } : column
    )));
  }

  async function handleUpdateCard(cardId: string, columnId: string, title: string) {
    const updated = await updateCard(projectId, cardId, { title });
    setColumns((current) => current.map((column) => {
      if (column.id !== columnId) return column;
      return {
        ...column,
        cards: column.cards.map((card) => (card.id === cardId ? { ...card, title: updated?.title ?? title } : card))
      };
    }));
  }

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
      reorderColumns(projectId, reordered.map((column) => column.id)).catch(() => {
        setError('Falha ao reordenar colunas.');
      });
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
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartões.'));
    } else {
      moveCard(projectId, draggableId, { toColumnId: destinationColumn.id, position: destination.index }).catch(() => setError('Falha ao mover cartão.'));
      reorderCards(projectId, destinationColumn.id, destinationCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartões.'));
      reorderCards(projectId, sourceColumn.id, sourceCards.map((card) => card.id)).catch(() => setError('Falha ao reordenar cartões.'));
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
                  {(columnProvided) => (
                    <div
                      className="kanban-column"
                      ref={columnProvided.innerRef}
                      {...columnProvided.draggableProps}
                    >
                      <div className="column-header" {...columnProvided.dragHandleProps}>
                        <input
                          className="column-title"
                          value={column.name}
                          onChange={(event) => handleRenameColumn(column.id, event.target.value)}
                          disabled={!canManage}
                        />
                        {canManage && (
                          <button className="link-button" onClick={() => handleDeleteColumn(column.id)}>Excluir</button>
                        )}
                      </div>
                      <Droppable droppableId={column.id} type="CARD">
                        {(cardProvided) => (
                          <div className="card-stack" ref={cardProvided.innerRef} {...cardProvided.droppableProps}>
                            {column.cards.map((card, cardIndex) => (
                              <Draggable draggableId={card.id} index={cardIndex} key={card.id}>
                                {(cardDragProvided) => (
                                  <div
                                    className="kanban-card"
                                    ref={cardDragProvided.innerRef}
                                    {...cardDragProvided.draggableProps}
                                    {...cardDragProvided.dragHandleProps}
                                  >
                                    <textarea
                                      className="card-title"
                                      value={card.title}
                                      onChange={(event) => handleUpdateCard(card.id, column.id, event.target.value)}
                                    />
                                    <div className="card-actions">
                                      <span className="badge">Posição {cardIndex + 1}</span>
                                      <button className="link-button" onClick={() => handleDeleteCard(column.id, card.id)}>Remover</button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
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
                        <button className="btn secondary" type="submit">Adicionar</button>
                      </form>
                    </div>
                  )}
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
                <button className="btn secondary" type="submit">Adicionar coluna</button>
              </form>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
