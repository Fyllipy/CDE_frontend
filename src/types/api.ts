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
  pdfOriginalFilename: string | null;
  dxfOriginalFilename: string | null;
  drawingName?: string | null;
  description: string | null;
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

export type GeneralDocument = {
  id: string;
  projectId: string;
  category: 'photos' | 'documents' | 'received' | 'others';
  originalFilename: string;
  storagePath: string;
  description: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
};

export type KanbanLabel = {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type KanbanAssignee = {
  id: string;
  name: string;
  email: string;
};

export type KanbanActivity = {
  id: string;
  cardId: string;
  actorId: string;
  actorName?: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type KanbanComment = {
  id: string;
  cardId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumn = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  color: string;
  wipLimit: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  cards: KanbanCard[];
};

export type KanbanChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  position: number;
  doneAt: string | null;
  assigneeId: string | null;
  assigneeName?: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KanbanChecklist = {
  id: string;
  cardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  items: KanbanChecklistItem[];
};

export type KanbanCustomField = {
  id: string;
  projectId: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'LIST' | 'BOOLEAN';
  options: Record<string, unknown> | null;
  required: boolean;
  createdAt: string;
  updatedAt: string;
  value: unknown;
};

export type KanbanCard = {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  parentId: string | null;
  labels: KanbanLabel[];
  assignees: KanbanAssignee[];
  commentsCount: number;
  checklists?: KanbanChecklist[];
  customFields?: KanbanCustomField[];
  subtasks?: KanbanCard[];
};

export type KanbanCardDetails = KanbanCard & {
  comments: KanbanComment[];
  activity: KanbanActivity[];
  checklists: KanbanChecklist[];
  customFields: KanbanCustomField[];
  subtasks: KanbanCard[];
};
