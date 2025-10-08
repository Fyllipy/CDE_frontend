import { api } from './client';
import type { FileEntry } from '../types/api';

type UploadPayload = {
  baseName: string;
  pdfFile?: File | null;
  dxfFile?: File | null;
  description?: string;
  drawingName?: string;
};

export async function fetchFiles(projectId: string): Promise<FileEntry[]> {
  const response = await api.get<{ files: FileEntry[] }>(`/projects/${projectId}/files`);
  return response.data.files;
}

export async function uploadProjectFile(projectId: string, payload: UploadPayload): Promise<FileEntry> {
  if (!payload.pdfFile && !payload.dxfFile) {
    throw new Error('Selecione ao menos um arquivo (PDF ou DXF).');
  }

  const formData = new FormData();

  if (payload.pdfFile) {
    const pdfFile = new File([payload.pdfFile], `${payload.baseName}.pdf`, { type: payload.pdfFile.type });
    formData.append('pdfFile', pdfFile);
  }
  if (payload.dxfFile) {
    const dxfFile = new File([payload.dxfFile], `${payload.baseName}.dxf`, { type: payload.dxfFile.type });
    formData.append('dxfFile', dxfFile);
  }
  if (payload.description) {
    formData.append('description', payload.description);
  }
  if (payload.drawingName) {
    formData.append('drawingName', payload.drawingName);
  }

  const response = await api.post<{ file: FileEntry; revision: FileEntry['revisions'][number] }>(
    `/projects/${projectId}/files/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return response.data.file;
}

export async function downloadRevision(projectId: string, revisionId: string, format: 'pdf' | 'dxf'): Promise<Blob> {
  const response = await api.get(`/projects/${projectId}/files/revisions/${revisionId}`, {
    params: { format },
    responseType: 'blob'
  });
  return response.data;
}

export async function deleteRevision(projectId: string, revisionId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/files/revisions/${revisionId}`);
}

export async function updateRevision(projectId: string, revisionId: string, data: { description?: string; drawingName?: string }): Promise<void> {
  await api.patch(`/projects/${projectId}/files/revisions/${revisionId}`, data);
}
