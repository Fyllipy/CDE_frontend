import { api } from './client';

export type AdminUser = { id: string; name: string; email: string; isAdmin: boolean; createdAt: string };
export type MembershipRow = { projectId: string; projectName: string; userId: string; userName: string | null; userEmail: string | null; role: 'MANAGER'|'MEMBER'; joinedAt: string };

export async function listUsers(): Promise<AdminUser[]> {
  const res = await api.get<{ users: AdminUser[] }>(`/admin/users`);
  return res.data.users;
}

export async function listMemberships(): Promise<MembershipRow[]> {
  const res = await api.get<{ memberships: MembershipRow[] }>(`/admin/memberships`);
  return res.data.memberships;
}

export async function updateMembershipRole(projectId: string, userId: string, role: 'MANAGER'|'MEMBER'): Promise<void> {
  await api.patch(`/admin/memberships`, { projectId, userId, role });
}

