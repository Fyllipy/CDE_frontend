import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, listMembers } from '../api/projects';
import type { Project, ProjectMembership } from '../types/api';
import { FileManager } from '../features/files/FileManager';
import { KanbanBoard } from '../features/kanban/KanbanBoard';
import './ProjectPage.css';

export function ProjectPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [membership, setMembership] = useState<ProjectMembership | null>(null);
  const [namingPattern, setNamingPattern] = useState<string | undefined>();
  const [members, setMembers] = useState<ProjectMembership[]>([]);
  const [view, setView] = useState<'files' | 'kanban'>('files');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const detail = await getProject(projectId);
        const team = await listMembers(projectId);
        if (active) {
          setProject(detail.project);
          setMembership(detail.membership);
          setNamingPattern(detail.namingPattern);
          setMembers(team);
        }
      } catch (err) {
        if (active) {
          setError('Não foi possível carregar os dados do projeto.');
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

  const userDirectory = useMemo(() => {
    const directory: Record<string, { name: string; email: string }> = {};
    members.forEach((member) => {
      if (member.userId) {
        directory[member.userId] = {
          name: member.name ?? member.userId,
          email: member.email ?? ''
        };
      }
    });
    return directory;
  }, [members]);

  if (loading) {
    return <div className="card">Carregando projeto...</div>;
  }

  if (error || !project || !membership) {
    return <div className="card error">{error ?? 'Projeto não encontrado.'}</div>;
  }

  const isManager = membership.role === 'MANAGER';

  return (
    <div className="project-page">
      <header className="project-header">
        <div>
          <h2>{project.name}</h2>
          {project.description && <p>{project.description}</p>}
          <div className="chip-row">
            <span className="badge">Seu papel: {membership.role === 'MANAGER' ? 'Gestor' : 'Membro'}</span>
            <span className="badge">Participantes: {members.length}</span>
          </div>
        </div>
        {isManager && (
          <Link className="btn secondary" to={`/projects/${projectId}/settings`}>
            Configurações do projeto
          </Link>
        )}
      </header>

      <div className="view-toggle">
        <button
          className={`toggle ${view === 'files' ? 'active' : ''}`}
          onClick={() => setView('files')}
        >
          Arquivos
        </button>
        <button
          className={`toggle ${view === 'kanban' ? 'active' : ''}`}
          onClick={() => setView('kanban')}
        >
          Kanban
        </button>
      </div>

      {view === 'files' ? (
        <FileManager
          projectId={projectId}
          namingPattern={namingPattern}
          canUpload
          userDirectory={userDirectory}
        />
      ) : (
        <div className="card">
          <KanbanBoard projectId={projectId} canManage={isManager} />
        </div>
      )}
    </div>
  );
}
