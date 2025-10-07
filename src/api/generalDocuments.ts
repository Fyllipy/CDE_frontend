import { api } from './client';
import type { GeneralDocument } from '../types/api';

type GeneralDocResponse = {
  documents: Record<'photos' | 'documents' | 'received' | 'others', GeneralDocument[]>;
};

export const generalDocCategories: Array<'photos' | 'documents' | 'received' | 'others'> = [
  'photos',
  'documents',
  'received',
  'others'
];

export async function fetchGeneralDocuments(projectId: string): Promise<Record<string, GeneralDocument[]>> {
  const response = await api.get<GeneralDocResponse>('/projects/' + projectId + '/general-docs');
  return response.data.documents;
}

export async function uploadGeneralDocument(projectId: string, file: File, category: string, description: string): Promise<GeneralDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (description) {
    formData.append('description', description);
  }

  const response = await api.post<{ document: GeneralDocument }>(
    '/projects/' + projectId + '/general-docs',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return response.data.document;
}

export async function deleteGeneralDocument(projectId: string, documentId: string): Promise<void> {
  await api.delete('/projects/' + projectId + '/general-docs/' + documentId);
}

export async function downloadGeneralDocument(projectId: string, documentId: string): Promise<Blob> {
  const response = await api.get('/projects/' + projectId + '/general-docs/' + documentId + '/download', {
    responseType: 'blob'
  });
  return response.data;
}
