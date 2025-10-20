import { api } from './client';
import type {
  KanbanColumn,
  KanbanCard,
  KanbanLabel,
  KanbanCardDetails,
  KanbanComment,
  KanbanActivity,
} from '../types/api';

type BoardPayload = {
  board: KanbanColumn[];
  labels: KanbanLabel[];
};

export async function fetchBoard(projectId: string): Promise<BoardPayload> {
  const response = await api.get<BoardPayload>(`/projects/${projectId}/kanban`);
  return response.data;
}

export async function createColumn(
  projectId: string,
  payload: { name: string; color?: string; wipLimit?: number | null }
): Promise<KanbanColumn> {
  const response = await api.post<{ column: KanbanColumn }>(`/projects/${projectId}/kanban/columns`, payload);
  return response.data.column;
}

export async function updateColumn(
  projectId: string,
  columnId: string,
  payload: { name?: string; color?: string; wipLimit?: number | null; archivedAt?: string | null }
): Promise<KanbanColumn | undefined> {
  const response = await api.put<{ column?: KanbanColumn }>(`/projects/${projectId}/kanban/columns/${columnId}`, payload);
  return response.data.column;
}

export async function deleteColumn(projectId: string, columnId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/columns/${columnId}`);
}

export async function createCard(
  projectId: string,
  columnId: string,
  payload: { title: string; description?: string; priority?: KanbanCard['priority'] }
): Promise<KanbanCard> {
  const response = await api.post<{ card: KanbanCard }>(`/projects/${projectId}/kanban/columns/${columnId}/cards`, payload);
  return response.data.card;
}

export async function updateCard(
  projectId: string,
  cardId: string,
  payload: {
    title?: string;
    description?: string | null;
    priority?: KanbanCard['priority'];
    startDate?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    archivedAt?: string | null;
  }
): Promise<KanbanCard | undefined> {
  const response = await api.put<{ card?: KanbanCard }>(`/projects/${projectId}/kanban/cards/${cardId}`, payload);
  return response.data.card;
}

export async function deleteCard(projectId: string, cardId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/cards/${cardId}`);
}

export async function moveCard(
  projectId: string,
  cardId: string,
  payload: { toColumnId: string; position: number }
): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/cards/${cardId}/move`, payload);
}

export async function reorderColumns(projectId: string, orderedIds: string[]): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/columns/reorder`, { orderedIds });
}

export async function reorderCards(projectId: string, columnId: string, orderedIds: string[]): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/columns/${columnId}/reorder-cards`, { orderedIds });
}

export async function fetchCardDetails(projectId: string, cardId: string): Promise<KanbanCardDetails> {
  const response = await api.get<{ card: KanbanCardDetails }>(`/projects/${projectId}/kanban/cards/${cardId}`);
  return response.data.card;
}

export async function createLabel(projectId: string, payload: { name: string; color: string }): Promise<KanbanLabel> {
  const response = await api.post<{ label: KanbanLabel }>(`/projects/${projectId}/kanban/labels`, payload);
  return response.data.label;
}

export async function updateLabel(
  projectId: string,
  labelId: string,
  payload: { name?: string; color?: string }
): Promise<KanbanLabel> {
  const response = await api.put<{ label: KanbanLabel }>(`/projects/${projectId}/kanban/labels/${labelId}`, payload);
  return response.data.label;
}

export async function deleteLabel(projectId: string, labelId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/labels/${labelId}`);
}

export async function attachLabel(projectId: string, cardId: string, payload: { labelId: string }): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/cards/${cardId}/labels`, payload);
}

export async function detachLabel(projectId: string, cardId: string, labelId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/cards/${cardId}/labels/${labelId}`);
}

export async function addAssignee(projectId: string, cardId: string, payload: { userId: string }): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/cards/${cardId}/assignees`, payload);
}

export async function removeAssignee(projectId: string, cardId: string, userId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/cards/${cardId}/assignees/${userId}`);
}

export async function createComment(
  projectId: string,
  cardId: string,
  payload: { body: string }
): Promise<KanbanComment> {
  const response = await api.post<{ comment: KanbanComment }>(`/projects/${projectId}/kanban/cards/${cardId}/comments`, payload);
  return response.data.comment;
}

export async function updateComment(
  projectId: string,
  commentId: string,
  payload: { body: string }
): Promise<KanbanComment> {
  const response = await api.put<{ comment: KanbanComment }>(`/projects/${projectId}/kanban/comments/${commentId}`, payload);
  return response.data.comment;
}

export async function deleteComment(projectId: string, commentId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/comments/${commentId}`);
}

export async function fetchComments(projectId: string, cardId: string): Promise<KanbanComment[]> {
  const response = await api.get<{ comments: KanbanComment[] }>(`/projects/${projectId}/kanban/cards/${cardId}/comments`);
  return response.data.comments;
}

export async function fetchActivity(projectId: string, cardId: string): Promise<KanbanActivity[]> {
  const response = await api.get<{ activities: KanbanActivity[] }>(`/projects/${projectId}/kanban/cards/${cardId}/activity`);
  return response.data.activities;
}
