import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addMemberByEmail, deleteProject, getProject, listMembers, removeMember, updateNamingStandard } from '../api/projects';
import type { Project, ProjectMembership } from '../types/api';
import './ProjectSettingsPage.css';

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<ProjectMembership | null>(null);
  const [members, setMembers] = useState<ProjectMembership[]>([]);
  const [pattern, setPattern] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patternSaving, setPatternSaving] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'MANAGER' | 'MEMBER'>('MEMBER');
  const [memberSaving, setMemberSaving] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const detail = await getProject(projectId);
        const team = await listMembers(projectId);
        if (active) {
          setProject(detail.project);
          setMembership(detail.membership);
          setPattern(detail.namingPattern ?? '');
          setMembers(team);
        }
      } catch (err) {
        if (active) {
          setError('Nao foi possivel carregar as configuracoes do projeto.');
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

  const isManager = membership?.role === 'MANAGER';

  async function handlePatternUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPatternSaving(true);
    setError(null);
    try {
      await updateNamingStandard(projectId, pattern);
    } catch (err) {
      setError('Nao foi possivel salvar o padrao de nomenclatura.');
    } finally {
      setPatternSaving(false);
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMemberEmail.trim()) {
      return;
    }
    setMemberSaving(true);
    setError(null);
    try {
      const member = await addMemberByEmail(projectId, { email: newMemberEmail.trim(), role: newMemberRole });
      setMembers((current) => {
        const without = current.filter((item) => item.userId !== member.userId);
        return [...without, member];
      });
      setNewMemberEmail('');
      setNewMemberRole('MEMBER');
    } catch (err) {
      setError('Nao foi possivel adicionar o membro. Verifique o email informado.');
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    await removeMember(projectId, memberId);
    setMembers((current) => current.filter((member) => member.userId !== memberId));
  }

  async function handleDeleteProject() {
    if (!project) {
      return;
    }
    const confirmation = window.confirm(`Remover o projeto "${project.name}"? Esta acao nao pode ser desfeita.`);
    if (!confirmation) {
      return;
    }
    setDeletingProject(true);
    setError(null);
    try {
      await deleteProject(projectId);
      navigate('/');
    } catch {
      setError('Nao foi possivel remover o projeto.');
      setDeletingProject(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando configuracoes...</div>;
  }

  if (!isManager) {
    return (
      <div className="card">
        <p>Somente gestores do projeto podem acessar esta pagina.</p>
        <button className="btn" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="settings card">
      <h2>Configuracoes do Projeto</h2>
      {project && <p className="subtitle">{project.name}</p>}
      <p className="subtitle">Gerencie o padrao de nomenclatura e o acesso dos membros.</p>
      {error && <p className="form-error">{error}</p>}

      <section className="settings-section">
        <h3>Padrao de Nomenclatura</h3>
        <form className="grid" onSubmit={handlePatternUpdate}>
          <div className="field">
            <label className="label" htmlFor="pattern">Definicao do padrao</label>
            <input
              id="pattern"
              className="input"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="{disciplina}-{tipo}-{sequencia}"
              required
            />
            <span className="hint">Utilize chaves para campos variaveis e hifens para separacao.</span>
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={patternSaving}>
              {patternSaving ? 'Salvando...' : 'Salvar padrao'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-section">
        <h3>Membros do Projeto</h3>
        <form className="member-form" onSubmit={handleAddMember}>
          <div className="field">
            <label className="label" htmlFor="member-email">Email do usuario</label>
            <input
              id="member-email"
              className="input"
              value={newMemberEmail}
              onChange={(event) => setNewMemberEmail(event.target.value)}
              placeholder="email@dominio.com"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="member-role">Papel</label>
            <select
              id="member-role"
              className="input"
              value={newMemberRole}
              onChange={(event) => setNewMemberRole(event.target.value as 'MANAGER' | 'MEMBER')}
            >
              <option value="MANAGER">Gestor</option>
              <option value="MEMBER">Membro</option>
            </select>
          </div>
          <button className="btn" type="submit" disabled={memberSaving}>
            {memberSaving ? 'Adicionando...' : 'Adicionar membro'}
          </button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Papel</th>
              <th>Desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td>
                  <div className="member-info">
                    <strong>{member.name ?? member.userId}</strong>
                    {member.email && <span>{member.email}</span>}
                  </div>
                </td>
                <td>{member.role === 'MANAGER' ? 'Gestor' : 'Membro'}</td>
                <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                <td>
                  {member.userId !== membership!.userId && (
                    <button className="link-button" onClick={() => handleRemoveMember(member.userId)}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="settings-section danger-zone">
        <h3>Remocao do Projeto</h3>
        <p className="subtitle">Excluir o projeto remove todos os arquivos, revisoes, quadros Kanban e documentos associados.</p>
        <button className="btn danger" type="button" onClick={handleDeleteProject} disabled={deletingProject}>
          {deletingProject ? 'Removendo...' : 'Excluir projeto'}
        </button>
      </section>
    </div>
  );
}
