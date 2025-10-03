import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createProject, fetchProjects } from '../api/projects';
import type { Project } from '../types/api';
import './DashboardPage.css';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchProjects();
        if (active) {
          setProjects(data);
        }
      } catch (err) {
        setError('Não foi possível carregar os projetos.');
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
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({ name, description });
      setProjects((current) => [project, ...current]);
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError('Não foi possível criar o projeto.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="card">Carregando seus projetos...</div>;
  }

  return (
    <div className="dashboard">
      <div className="flex-between">
        <div>
          <h2>Meus Projetos</h2>
          <p className="subtitle">Ambientes de colaboração onde você possui acesso.</p>
        </div>
        <button className="btn" onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Cancelar' : 'Novo Projeto'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <form className="card create-form" onSubmit={handleCreate}>
          <div className="field">
            <label className="label" htmlFor="project-name">Nome do projeto</label>
            <input
              id="project-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Obra Via Elevada SP-062"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="project-description">Descrição</label>
            <textarea
              id="project-description"
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Resumo do escopo ou objetivo do projeto"
            />
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar projeto'}
            </button>
          </div>
        </form>
      )}

      <div className="projects-grid">
        {projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="project-card card">
            <div className="project-card-header">
              <h3>{project.name}</h3>
              <span className="badge">Atualizado em {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            {project.description && <p>{project.description}</p>}
          </Link>
        ))}
        {!projects.length && !showForm && (
          <div className="card empty-state">
            <h3>Comece criando um projeto</h3>
            <p>Configure o padrão de nomenclatura, convide a equipe e centralize arquivos e tarefas.</p>
            <button className="btn" onClick={() => setShowForm(true)}>Criar primeiro projeto</button>
          </div>
        )}
      </div>
    </div>
  );
}
