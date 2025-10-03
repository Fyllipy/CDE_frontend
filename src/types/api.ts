export type ApiUser = {
  id: string;
  name: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMembership = {
  projectId: string;
  userId: string;
  role: 'MANAGER' | 'MEMBER';
  name?: string;
  email?: string;
  joinedAt: string;
};

export type NamingStandard = string;

export type FileRevision = {
  id: string;
  fileId: string;
  revisionIndex: number;
  revisionLabel: string;
  uploadedById: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  storagePath: string;
  originalFilename: string;
  createdAt: string;
};

export type FileEntry = {
  id: string;
  projectId: string;
  baseName: string;
  extension: string;
  currentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  revisions: FileRevision[];
};

export type KanbanColumn = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  color: string;
  createdAt: string;
  updatedAt: string;
  cards: KanbanCard[];
};

export type KanbanCard = {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description: string | null;
  color: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};
