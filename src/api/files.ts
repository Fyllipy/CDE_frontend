import { api } from './client';
import type { FileEntry } from '../types/api';

export async function fetchFiles(projectId: string): Promise<FileEntry[]> {
  const response = await api.get<{ files: FileEntry[] }>(`/projects/${projectId}/files`);
  return response.data.files;
}

export async function uploadProjectFile(projectId: string, file: File, composedName: string): Promise<FileEntry> {
  const formData = new FormData();
  const renamedFile = new File([file], composedName, { type: file.type });
  formData.append('file', renamedFile);
  const response = await api.post<{ file: FileEntry; revision: FileEntry['revisions'][number] }>(
    `/projects/${projectId}/files/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return response.data.file;
}

export async function downloadRevision(projectId: string, revisionId: string): Promise<Blob> {
  const response = await api.get(`/projects/${projectId}/files/revisions/${revisionId}`, {
    responseType: 'blob'
  });
  return response.data;
}
