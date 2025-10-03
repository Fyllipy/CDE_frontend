import { api } from './client';
import type { KanbanColumn, KanbanCard } from '../types/api';

export async function fetchBoard(projectId: string): Promise<KanbanColumn[]> {
  const response = await api.get<{ board: KanbanColumn[] }>(`/projects/${projectId}/kanban`);
  return response.data.board;
}

export async function createColumn(projectId: string, payload: { name: string; color?: string }): Promise<KanbanColumn> {
  const response = await api.post<{ column: KanbanColumn }>(`/projects/${projectId}/kanban/columns`, payload);
  return response.data.column;
}

export async function updateColumn(projectId: string, columnId: string, payload: { name?: string; color?: string }): Promise<KanbanColumn | undefined> {
  const response = await api.put<{ column?: KanbanColumn }>(`/projects/${projectId}/kanban/columns/${columnId}`, payload);
  return response.data.column;
}

export async function deleteColumn(projectId: string, columnId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/columns/${columnId}`);
}

export async function createCard(projectId: string, columnId: string, payload: { title: string; description?: string; color?: string | null }): Promise<KanbanCard> {
  const response = await api.post<{ card: KanbanCard }>(`/projects/${projectId}/kanban/columns/${columnId}/cards`, payload);
  return response.data.card;
}

export async function updateCard(projectId: string, cardId: string, payload: { title?: string; description?: string | null; color?: string | null }): Promise<KanbanCard | undefined> {
  const response = await api.put<{ card?: KanbanCard }>(`/projects/${projectId}/kanban/cards/${cardId}`, payload);
  return response.data.card;
}

export async function deleteCard(projectId: string, cardId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/kanban/cards/${cardId}`);
}

export async function moveCard(projectId: string, cardId: string, payload: { toColumnId: string; position: number }): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/cards/${cardId}/move`, payload);
}

export async function reorderColumns(projectId: string, orderedIds: string[]): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/columns/reorder`, { orderedIds });
}

export async function reorderCards(projectId: string, columnId: string, orderedIds: string[]): Promise<void> {
  await api.post(`/projects/${projectId}/kanban/columns/${columnId}/reorder-cards`, { orderedIds });
}
