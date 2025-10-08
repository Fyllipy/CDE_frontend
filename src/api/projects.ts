import { api } from './client';
import type { Project, ProjectMembership } from '../types/api';

export async function fetchProjects(): Promise<Project[]> {
  const response = await api.get<{ projects: Project[] }>('/projects');
  return response.data.projects;
}

export async function createProject(payload: { name: string; description?: string }): Promise<Project> {
  const response = await api.post<{ project: Project }>('/projects', payload);
  return response.data.project;
}

export async function getProject(projectId: string): Promise<{ project: Project; membership: ProjectMembership; namingPattern: string | undefined }> {
  const response = await api.get<{ project: Project; membership: ProjectMembership; namingPattern?: string }>(`/projects/${projectId}`);
  return {
    project: response.data.project,
    membership: response.data.membership,
    namingPattern: response.data.namingPattern
  };
}

export async function updateProject(projectId: string, payload: { name: string; description?: string }): Promise<Project> {
  const response = await api.put<{ project: Project }>(`/projects/${projectId}`, payload);
  return response.data.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function listMembers(projectId: string): Promise<ProjectMembership[]> {
  const response = await api.get<{ members: ProjectMembership[] }>(`/projects/${projectId}/members`);
  return response.data.members;
}

export async function addMember(projectId: string, payload: { userId: string; role: ProjectMembership['role'] }): Promise<ProjectMembership> {
  const response = await api.post<{ member: ProjectMembership }>(`/projects/${projectId}/members`, payload);
  return response.data.member;
}

export async function addMemberByEmail(projectId: string, payload: { email: string; role: ProjectMembership['role'] }): Promise<ProjectMembership> {
  const response = await api.post<{ member: ProjectMembership }>(`/projects/${projectId}/members/by-email`, payload);
  return response.data.member;
}

export async function updateMemberRole(projectId: string, memberId: string, role: ProjectMembership['role']): Promise<ProjectMembership> {
  const response = await api.patch<{ member: ProjectMembership }>(`/projects/${projectId}/members/${memberId}`, { role });
  return response.data.member;
}

export async function removeMember(projectId: string, memberId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
}

export async function updateNamingStandard(projectId: string, pattern: string): Promise<string> {
  const response = await api.patch<{ pattern: string }>(`/projects/${projectId}/naming-standard`, { pattern });
  return response.data.pattern;
}
