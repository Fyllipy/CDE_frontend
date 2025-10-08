import { useEffect, useState } from 'react';
import { listUsers, listMemberships, updateMembershipRole, type AdminUser, type MembershipRow } from '../api/admin';

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [u, m] = await Promise.all([listUsers(), listMemberships()]);
        if (active) {
          setUsers(u);
          setMemberships(m);
        }
      } catch {
        if (active) setError('Nao foi possivel carregar dados administrativos');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function handleChangeRole(projectId: string, userId: string, role: 'MANAGER'|'MEMBER') {
    await updateMembershipRole(projectId, userId, role);
    const next = await listMemberships();
    setMemberships(next);
  }

  if (loading) return <div className="card">Carregando admin...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card" style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h2>Admin - Usuários</h2>
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>Email</th><th>Admin</th><th>Criado em</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.isAdmin ? 'Sim' : 'Não'}</td>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Vínculos em Projetos</h2>
        <table className="table">
          <thead>
            <tr><th>Projeto</th><th>Usuário</th><th>Email</th><th>Papel</th><th></th></tr>
          </thead>
          <tbody>
            {memberships.map(row => (
              <tr key={`${row.projectId}-${row.userId}`}>
                <td>{row.projectName}</td>
                <td>{row.userName ?? row.userId}</td>
                <td>{row.userEmail}</td>
                <td>
                  <select className="input" value={row.role} onChange={(e) => handleChangeRole(row.projectId, row.userId, e.target.value as 'MANAGER'|'MEMBER')}>
                    <option value="MANAGER">Gestor</option>
                    <option value="MEMBER">Membro</option>
                  </select>
                </td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

