import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import {
  createCard,
  createColumn,
  fetchBoard,
  moveCard,
  reorderCards,
  reorderColumns,
  updateCard,
  updateColumn,
  createLabel,
  fetchCardDetails,
  createComment,
  archiveCard,
  restoreCard,
  archiveColumn,
  restoreColumn,
  createChecklist,
  reorderChecklists,
  updateChecklist,
  deleteChecklist,
  createChecklistItem,
  reorderChecklistItems,
  updateChecklistItem,
  deleteChecklistItem,
  promoteChecklistItem,
  listCustomFields,
  createCustomField,
  deleteCustomField,
  setCardCustomFieldValue,
} from "../../api/kanban";
import type {
  KanbanCard,
  KanbanCardDetails,
  KanbanColumn,
  KanbanLabel,
  KanbanChecklist,
  KanbanChecklistItem,
  KanbanCustomField,
} from "../../types/api";
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
  const [archivedColumns, setArchivedColumns] = useState<KanbanColumn[]>([]);
  const [archivedCards, setArchivedCards] = useState<KanbanCard[]>([]);
  const [customFields, setCustomFields] = useState<KanbanCustomField[]>([]);
  const [selectedCardDetails, setSelectedCardDetails] = useState<KanbanCardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState(paletteColor(0));
  const [cardDraftTitles, setCardDraftTitles] = useState<DraftMap>({});
  const [cardDraftDescriptions, setCardDraftDescriptions] = useState<DraftMap>({});
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563EB");
  const [customFieldDraft, setCustomFieldDraft] = useState<{ name: string; type: KanbanCustomField['type']; required: boolean }>(
    { name: "", type: "TEXT", required: false }
  );
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [checklistItemDrafts, setChecklistItemDrafts] = useState<Record<string, string>>({});
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload = await fetchBoard(projectId);
        const fields = await listCustomFields(projectId);
        if (active) {
          setColumns(payload.board);
          setLabels(payload.labels ?? []);
          setArchivedColumns(payload.archivedColumns ?? []);
          setArchivedCards(payload.archivedCards ?? []);
          setCustomFields(fields ?? []);
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

  // Prevent background scroll when any modal is open
  useEffect(() => {
    const hasModalOpen = Boolean(selectedCardDetails) || Boolean(showProjectSettings) || Boolean(showAddColumnModal);
    const original = document.body.style.overflow;
    if (hasModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [selectedCardDetails, showProjectSettings, showAddColumnModal]);

  async function refreshBoard() {
    try {
      const payload = await fetchBoard(projectId);
      const fields = await listCustomFields(projectId);
      setColumns(payload.board);
      setLabels(payload.labels ?? []);
      setArchivedColumns(payload.archivedColumns ?? []);
      setArchivedCards(payload.archivedCards ?? []);
      setCustomFields(fields ?? []);
      setNewColumnColor(paletteColor((payload.board ?? []).length));
    } catch {
      setError("Nao foi possivel atualizar o quadro.");
    }
  }

  async function refreshCardDetails(cardId: string) {
    try {
      const details = await fetchCardDetails(projectId, cardId);
      setSelectedCardDetails(details);
    } catch {
      setError('Nao foi possivel atualizar os detalhes do cartao.');
    }
  }

  // Bulk actions removed from UI per request

  async function handleRestoreArchivedCard(cardId: string) {
    try {
      await restoreCard(projectId, cardId);
      await refreshBoard();
    } catch {
      setError('Nao foi possivel restaurar o cartao.');
    }
  }

  async function handleRestoreArchivedColumn(columnId: string) {
    try {
      await restoreColumn(projectId, columnId);
      await refreshBoard();
    } catch {
      setError('Nao foi possivel restaurar a coluna.');
    }
  }

  async function handleCreateCustomField() {
    if (!canManage) {
      return;
    }
    const name = customFieldDraft.name.trim();
    if (!name) {
      return;
    }
    try {
      const created = await createCustomField(projectId, {
        name,
        type: customFieldDraft.type,
        required: customFieldDraft.required,
      });
      setCustomFields((current) => [...current, created]);
      setCustomFieldDraft({ name: "", type: customFieldDraft.type, required: false });
    } catch {
      setError('Nao foi possivel criar o campo personalizado.');
    }
  }

  async function handleDeleteCustomField(fieldId: string) {
    if (!canManage) {
      return;
    }
    try {
      await deleteCustomField(projectId, fieldId);
      setCustomFields((current) => current.filter((field) => field.id !== fieldId));
    } catch {
      setError('Nao foi possivel remover o campo personalizado.');
    }
  }

  async function handleCreateChecklistForCard() {
    if (!selectedCardDetails) {
      return;
    }
    const title = newChecklistTitle.trim();
    if (!title) {
      return;
    }
    try {
      await createChecklist(projectId, selectedCardDetails.id, { title });
      setNewChecklistTitle("");
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel criar a checklist.');
    }
  }

  async function handleUpdateChecklistTitle(checklistId: string, title: string) {
    if (!selectedCardDetails) {
      return;
    }
    try {
      await updateChecklist(projectId, checklistId, { title });
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel atualizar a checklist.');
    }
  }

  async function handleDeleteChecklist(checklistId: string) {
    if (!selectedCardDetails) {
      return;
    }
    try {
      await deleteChecklist(projectId, checklistId);
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel remover a checklist.');
    }
  }

  async function handleCreateChecklistItem(checklistId: string) {
    if (!selectedCardDetails) {
      return;
    }
    const draft = checklistItemDrafts[checklistId]?.trim() ?? "";
    if (!draft) {
      return;
    }
    try {
      await createChecklistItem(projectId, checklistId, { title: draft });
      setChecklistItemDrafts((current) => ({ ...current, [checklistId]: "" }));
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel criar o item da checklist.');
    }
  }

  async function handleUpdateChecklistItem(itemId: string, updates: Partial<KanbanChecklistItem>) {
    if (!selectedCardDetails) {
      return;
    }
    try {
      await updateChecklistItem(projectId, itemId, {
        title: updates.title,
        doneAt: updates.doneAt ?? null,
        assigneeId: updates.assigneeId ?? null,
        dueDate: updates.dueDate ?? null,
      });
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel atualizar o item da checklist.');
    }
  }

  async function handleDeleteChecklistItem(itemId: string) {
    if (!selectedCardDetails) {
      return;
    }
    try {
      await deleteChecklistItem(projectId, itemId);
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel remover o item da checklist.');
    }
  }

  async function handleMoveChecklist(checklistId: string, direction: number) {
    if (!selectedCardDetails) {
      return;
    }
    const checklists = selectedCardDetails.checklists ?? [];
    const index = checklists.findIndex((c) => c.id === checklistId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= checklists.length) {
      return;
    }
    const orderedIds = [...checklists];
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(targetIndex, 0, moved);
    try {
      await reorderChecklists(projectId, selectedCardDetails.id, orderedIds.map((c) => c.id));
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel reordenar as checklists.');
    }
  }

  async function handleMoveChecklistItem(checklistId: string, itemId: string, direction: number) {
    if (!selectedCardDetails) {
      return;
    }
    const checklist = selectedCardDetails.checklists.find((c) => c.id === checklistId);
    if (!checklist) {
      return;
    }
    const items = checklist.items ?? [];
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
      return;
    }
    const orderedIds = [...items];
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(targetIndex, 0, moved);
    try {
      await reorderChecklistItems(projectId, checklistId, orderedIds.map((item) => item.id));
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel reordenar os itens da checklist.');
    }
  }

  async function handlePromoteItem(itemId: string) {
    if (!selectedCardDetails) {
      return;
    }
    try {
      await promoteChecklistItem(projectId, itemId);
      await refreshBoard();
      await refreshCardDetails(selectedCardDetails.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('WIP')) {
        setError('Nao foi possivel promover o item: limite WIP atingido.');
      } else {
        setError('Nao foi possivel promover o item para subtarefa.');
      }
    }
  }

  async function handleCustomFieldValueChange(fieldId: string, value: unknown) {
    if (!selectedCardDetails) {
      return;
    }
    setSelectedCardDetails((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        customFields: current.customFields.map((field) => (
          field.id === fieldId ? { ...field, value } : field
        )),
      };
    });
    try {
      await setCardCustomFieldValue(projectId, selectedCardDetails.id, fieldId, value);
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel atualizar o campo personalizado.');
      await refreshCardDetails(selectedCardDetails.id);
    }
  }

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
      setShowAddColumnModal(false);
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
      setNewCommentBody("");
    } catch {
      setError('Nao foi possivel carregar os detalhes do cartao.');
    }
  }

  function closeCardDetails() {
    setSelectedCardDetails(null);
  }

  async function handleCreateComment() {
    if (!selectedCardDetails) return;
    const body = newCommentBody.trim();
    if (!body) return;
    try {
      await createComment(projectId, selectedCardDetails.id, { body });
      setNewCommentBody("");
      await refreshCardDetails(selectedCardDetails.id);
    } catch {
      setError('Nao foi possivel adicionar o comentario.');
    }
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

  async function handleArchiveColumn(columnId: string) {
    try {
      const column = columns.find((item) => item.id === columnId) ?? null;
      await archiveColumn(projectId, columnId);
      setColumns((current) => current.filter((item) => item.id !== columnId));
      if (column) {
        setArchivedColumns((current) => [{ ...column, archivedAt: new Date().toISOString() }, ...current]);
      }
    } catch {
      setError('Nao foi possivel arquivar a coluna.');
    }
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

  async function handleArchiveCard(columnId: string, cardId: string) {
    try {
      const card = columns
        .find((col) => col.id === columnId)?.cards
        .find((item) => item.id === cardId) ?? null;
      await archiveCard(projectId, cardId);
      setColumns((current) => current.map((column) => (
        column.id === columnId ? { ...column, cards: column.cards.filter((item) => item.id !== cardId) } : column
      )));
      if (card) {
        setArchivedCards((current) => [{ ...card, archivedAt: new Date().toISOString() }, ...current]);
      }
      if (selectedCardDetails?.id === cardId) {
        setSelectedCardDetails(null);
      }
    } catch {
      setError('Nao foi possivel arquivar o cartao.');
    }
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

  const cardChecklists: KanbanChecklist[] = selectedCardDetails?.checklists ?? [];
  const cardComments = selectedCardDetails?.comments ?? [];
  const cardActivity = selectedCardDetails?.activity ?? [];
  const cardSubtasks = selectedCardDetails?.subtasks ?? [];

  const cardCustomFields: KanbanCustomField[] = selectedCardDetails
    ? (selectedCardDetails.customFields && selectedCardDetails.customFields.length > 0
      ? selectedCardDetails.customFields
      : customFields.map((field) => ({ ...field, value: null })))
    : [];

    function renderCustomFieldInput(field: KanbanCustomField) {
      const key = `${field.id}-input`;
      if (field.type === "BOOLEAN") {
        return (
          <input
            key={key}
            type="checkbox"
            checked={Boolean(field.value)}
            onChange={(event) => handleCustomFieldValueChange(field.id, event.target.checked)}
          />
        );
      }

      if (field.type === "LIST" && Array.isArray(field.options) && field.options.length > 0) {
        const current = Array.isArray(field.value) ? field.value[0] ?? "" : field.value ?? "";
        return (
          <select
            key={key}
            value={current}
            onChange={(event) => handleCustomFieldValueChange(field.id, event.target.value ? event.target.value : null)}
          >
            <option value="">Selecionar...</option>
            {field.options.map((option: any) => (
              <option key={String(option)} value={String(option)}>{String(option)}</option>
            ))}
          </select>
        );
      }

      if (field.type === "DATE") {
        const current = field.value ? new Date(field.value as string).toISOString().slice(0, 10) : "";
        return (
          <input
            key={key}
            type="date"
            defaultValue={current}
            onBlur={(event) => handleCustomFieldValueChange(field.id, event.target.value || null)}
          />
        );
      }

      if (field.type === "NUMBER") {
        const current = typeof field.value === "number" ? field.value : field.value ? Number(field.value) : "";
        return (
          <input
            key={key}
            type="number"
            defaultValue={current as number | string}
            onBlur={(event) => {
              const value = event.target.value.trim();
              handleCustomFieldValueChange(field.id, value ? Number(value) : null);
            }}
          />
        );
      }

      const current = typeof field.value === "string" ? field.value : field.value ? String(field.value) : "";
      return (
        <input
          key={key}
          type="text"
          defaultValue={current}
          onBlur={(event) => handleCustomFieldValueChange(field.id, event.target.value)}
        />
      );
    }

  if (loading) {
    return <div className="card">Montando o quadro Kanban...</div>;
  }

  return (
    <div className="kanban">
      {error && <p className="form-error">{error}</p>}
      <div className="kanban-toolbar">
        {canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <button className="btn" type="button" onClick={() => setShowProjectSettings(true)}>
              Configuracoes
            </button>
            <button className="btn ghost" type="button" onClick={() => setShowAddColumnModal(true)}>
              Nova coluna
            </button>
          </div>
        )}
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
                                <button className="link-button" onClick={() => handleArchiveColumn(column.id)}>Arquivar</button>
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
                                          {/* Bulk selection removed per request */}
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
                                                  handleArchiveCard(column.id, card.id);
                                                }}
                                              >
                                                Arquivar
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
          {/* Add-column form moved to modal */}
        </div>
      </DragDropContext>
      {canManage && showAddColumnModal && (
        <div className="modal-overlay" role="presentation" onClick={() => setShowAddColumnModal(false)}>
          <div
            className="add-column-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Adicionar coluna"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="project-settings-header">
              <h3>Adicionar coluna</h3>
              <button className="btn ghost" type="button" onClick={() => setShowAddColumnModal(false)}>Fechar</button>
            </div>
            <form className="label-form" onSubmit={handleCreateColumn}>
              <input
                className="input"
                placeholder="Nome da coluna"
                value={newColumnName}
                onChange={(event) => setNewColumnName(event.target.value)}
              />
              <label className="label-color-picker">
                Cor
                <input
                  className="color-input"
                  type="color"
                  value={newColumnColor}
                  onChange={(event) => setNewColumnColor(event.target.value || paletteColor(columns.length))}
                />
              </label>
              <button className="btn secondary" type="submit">Adicionar</button>
            </form>
          </div>
        </div>
      )}
      {canManage && showProjectSettings && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setShowProjectSettings(false)}
        >
          <div
            className="project-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Configuracoes do projeto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="project-settings-header">
              <div>
                <h3>Configuracoes do projeto</h3>
                <p className="muted">Gerencie etiquetas e campos personalizados deste quadro.</p>
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setShowProjectSettings(false)}
              >
                Fechar
              </button>
            </div>
            <div className="project-settings-body">
              <section className="modal-section">
                <h4>Nova etiqueta</h4>
                <p className="muted">Crie etiquetas com cores para destacar tipos de tarefa.</p>
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
                <div className="labels-list">
                  {labels.length === 0 && <span className="muted">Nenhuma etiqueta cadastrada ainda.</span>}
                  {labels.map((label) => (
                    <span key={label.id} className="label-chip" style={{ background: label.color }}>
                      {label.name}
                    </span>
                  ))}
                </div>
              </section>
              <section className="modal-section">
                <h4>Novo campo personalizado</h4>
                <p className="muted">Campos ajudam a capturar informacoes especificas de cada cartao.</p>
                <div className="custom-field-form">
                  <input
                    className="input"
                    placeholder="Nome do campo"
                    value={customFieldDraft.name}
                    onChange={(event) => setCustomFieldDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                  <select
                    className="input"
                    value={customFieldDraft.type}
                    onChange={(event) => setCustomFieldDraft((current) => ({ ...current, type: event.target.value as KanbanCustomField['type'] }))}
                  >
                    <option value="TEXT">Texto</option>
                    <option value="NUMBER">Numero</option>
                    <option value="DATE">Data</option>
                    <option value="LIST">Lista</option>
                    <option value="BOOLEAN">Booleano</option>
                  </select>
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={customFieldDraft.required}
                      onChange={(event) => setCustomFieldDraft((current) => ({ ...current, required: event.target.checked }))}
                    />
                    Obrigatorio
                  </label>
                  <button className="btn secondary" type="button" onClick={handleCreateCustomField}>Adicionar campo</button>
                </div>
                {customFields.length > 0 && (
                  <ul className="custom-field-list">
                    {customFields.map((field) => (
                      <li key={field.id}>
                        <span>{field.name} ({field.type.toLowerCase()})</span>
                        <button className="link-button" onClick={() => handleDeleteCustomField(field.id)}>Remover</button>
                      </li>
                    ))}
                  </ul>
                )}
                {customFields.length === 0 && <span className="muted">Nenhum campo cadastrado.</span>}
              </section>
              <section className="modal-section">
                <h4>Colunas arquivadas</h4>
                {archivedColumns.length === 0 && <span className="muted">Nenhuma coluna arquivada.</span>}
                {archivedColumns.length > 0 && (
                  <ul className="archived-list">
                    {archivedColumns.map((column) => (
                      <li key={column.id}>
                        <span>{column.name}</span>
                        <button className="link-button" onClick={() => handleRestoreArchivedColumn(column.id)}>Restaurar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="modal-section">
                <h4>Cartoes arquivados recentes</h4>
                {archivedCards.length === 0 && <span className="muted">Nenhum cartao arquivado.</span>}
                {archivedCards.length > 0 && (
                  <ul className="archived-list">
                    {archivedCards.slice(0, 10).map((card) => (
                      <li key={card.id}>
                        <span>{card.title}</span>
                        <button className="link-button" onClick={() => handleRestoreArchivedCard(card.id)}>Restaurar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
      {selectedCardDetails && (
        <div className="card-details-modal">
          <div className="card-details">
            <div className="card-details-header">
              <div>
                <h3>{selectedCardDetails.title}</h3>
                <p className="muted">Coluna: {columns.find((column) => column.id === selectedCardDetails.columnId)?.name ?? 'Desconhecida'}</p>
              </div>
              <div className="card-details-actions">
                <button
                  className="btn ghost"
                  onClick={() => handleArchiveCard(selectedCardDetails.columnId, selectedCardDetails.id)}
                >
                  Arquivar cartao
                </button>
                <button className="btn" onClick={closeCardDetails}>Fechar</button>
              </div>
            </div>
            <section className="card-section">
              <h4>Descricao</h4>
              <textarea
                className="input"
                value={selectedCardDetails.description ?? ""}
                onChange={(event) => setSelectedCardDetails((current) => current ? { ...current, description: event.target.value } : current)}
                onBlur={(event) => persistCard(selectedCardDetails.id, selectedCardDetails.columnId, { description: event.target.value })}
                placeholder="Adicione detalhes da tarefa"
              />
            </section>
            <section className="card-section">
              <h4>Campos personalizados</h4>
              {cardCustomFields.length === 0 && <p className="muted">Nenhum campo configurado.</p>}
              {cardCustomFields.length > 0 && (
                <div className="custom-field-grid">
                  {cardCustomFields.map((field) => (
                    <label key={field.id} className="custom-field-control">
                      <span>{field.name}</span>
                      {renderCustomFieldInput(field)}
                    </label>
                  ))}
                </div>
              )}
              {canManage && (
                <div>
                  <button className="btn ghost" type="button" onClick={() => setShowProjectSettings(true)}>
                    Adicionar campo personalizado
                  </button>
                </div>
              )}
            </section>
            <section className="card-section">
              <h4>Checklists</h4>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateChecklistForCard();
                }}
              >
                <input
                  className="input"
                  placeholder="Nova checklist"
                  value={newChecklistTitle}
                  onChange={(event) => setNewChecklistTitle(event.target.value)}
                />
                <button className="btn secondary" type="submit">Adicionar</button>
              </form>
              {cardChecklists.length === 0 && <p className="muted">Nenhuma checklist criada.</p>}
              {cardChecklists.map((checklist, checklistIndex) => (
                <div key={checklist.id} className="checklist-block">
                  <div className="checklist-header">
                    <input
                      className="input checklist-title"
                      defaultValue={checklist.title}
                      onBlur={(event) => handleUpdateChecklistTitle(checklist.id, event.target.value)}
                    />
                    <div className="checklist-actions">
                      <button className="link-button" onClick={() => handleMoveChecklist(checklist.id, -1)} disabled={checklistIndex === 0}>Subir</button>
                      <button className="link-button" onClick={() => handleMoveChecklist(checklist.id, 1)} disabled={checklistIndex === cardChecklists.length - 1}>Descer</button>
                      <button className="link-button" onClick={() => handleDeleteChecklist(checklist.id)}>Excluir</button>
                    </div>
                  </div>
                  <ul className="checklist-items">
                    {checklist.items.map((item, itemIndex) => (
                      <li key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          checked={Boolean(item.doneAt)}
                          onChange={(event) => handleUpdateChecklistItem(item.id, { doneAt: event.target.checked ? new Date().toISOString() : null })}
                        />
                        <span
                          className="checklist-item-title"
                          style={{ textDecoration: item.doneAt ? 'line-through' : undefined }}
                        >
                          {item.title}
                        </span>
                        <div className="checklist-item-actions">
                          <button className="link-button" onClick={() => handleMoveChecklistItem(checklist.id, item.id, -1)} disabled={itemIndex === 0}>↑</button>
                          <button className="link-button" onClick={() => handleMoveChecklistItem(checklist.id, item.id, 1)} disabled={itemIndex === checklist.items.length - 1}>↓</button>
                          <button className="link-button" onClick={() => handlePromoteItem(item.id)}>Promover</button>
                          <button className="link-button" onClick={() => handleDeleteChecklistItem(item.id)}>Remover</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      // Clear immediately for snappier UX
                      setChecklistItemDrafts((draft) => ({ ...draft, [checklist.id]: "" }));
                      handleCreateChecklistItem(checklist.id);
                    }}
                  >
                    <input
                      className="input"
                      placeholder="Novo item"
                      value={checklistItemDrafts[checklist.id] ?? ""}
                      onChange={(event) => setChecklistItemDrafts((draft) => ({ ...draft, [checklist.id]: event.target.value }))}
                    />
                    <button className="btn ghost" type="submit">Adicionar item</button>
                  </form>
                </div>
              ))}
            </section>
            {cardSubtasks.length > 0 && (
              <section className="card-section">
                <h4>Subtarefas</h4>
                <ul className="subtask-list">
                  {cardSubtasks.map((subtask) => (
                    <li key={subtask.id}>
                      <button className="link-button" onClick={() => openCardDetails(subtask.id)}>{subtask.title}</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="card-section">
              <h4>Comentarios</h4>
              {cardComments.length === 0 && <p className="muted">Nenhum comentario ainda.</p>}
              {cardComments.map((comment) => (
                <div key={comment.id} className="comment">
                  <strong>{comment.authorName ?? comment.authorId}</strong>
                  <p>{comment.body}</p>
                </div>
              ))}
              <form
                className="inline-form"
                onSubmit={(e) => { e.preventDefault(); handleCreateComment(); }}
              >
                <input
                  className="input"
                  placeholder="Escreva um comentario"
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                />
                <button className="btn secondary" type="submit">Adicionar comentario</button>
              </form>
            </section>
            <section className="card-section">
              <h4>Atividade</h4>
              {cardActivity.length === 0 && <p className="muted">Sem atividades registradas.</p>}
              {cardActivity.map((activity) => (
                <div key={activity.id} className="activity">
                  <small>{activity.type} · {new Date(activity.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </section>
            <div className="card-details-footer">
              <button className="btn" onClick={closeCardDetails}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
