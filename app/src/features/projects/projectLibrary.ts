import { useSyncExternalStore } from 'react';
import { recentProjects, type CanvasNodeType, type ProjectItem } from '@/data/siteData';
import {
  resolveAutomaticProjectCover,
  type ProjectCoverCandidate,
  type ProjectCoverSource,
} from './projectCover';

const STORAGE_KEY = 'visioner.project-library.v1';

export type ProjectRecord = ProjectItem & {
  createdAt: string;
  updatedAt: string;
  coverSource?: ProjectCoverSource;
};

const listeners = new Set<() => void>();

function normalizeDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value.replaceAll('/', '-'));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function getSeedProjects(): ProjectRecord[] {
  return recentProjects
    .filter((project) => !project.isCreateNew)
    .map((project, index) => {
      const fallback = new Date(Date.UTC(2026, 3, 24 - index)).toISOString();
      const updatedAt = normalizeDate(project.date, fallback);
      const cover = resolveAutomaticProjectCover(project.canvasNodes || []);
      return {
        ...project,
        thumbnail: cover?.thumbnail,
        coverSource: cover?.source,
        createdAt: project.createdAt ?? updatedAt,
        updatedAt: project.updatedAt ?? updatedAt,
      };
    });
}

function normalizeStoredProject(project: ProjectRecord): ProjectRecord {
  if (project.coverSource) return project;
  const cover = resolveAutomaticProjectCover(project.canvasNodes || []);
  return {
    ...project,
    thumbnail: cover?.thumbnail,
    coverSource: cover?.source,
  };
}

function loadProjects(): ProjectRecord[] {
  if (typeof window === 'undefined') return getSeedProjects();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return getSeedProjects();
    const parsed = JSON.parse(stored) as ProjectRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeStoredProject) : getSeedProjects();
  } catch {
    return getSeedProjects();
  }
}

let projects = loadProjects();

function commit(nextProjects: ProjectRecord[]) {
  projects = nextProjects;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Keep the in-memory project library usable if browser storage is unavailable or full.
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjectLibrary() {
  return useSyncExternalStore(subscribe, () => projects, () => projects);
}

export function getProjectRecord(projectId: string | undefined) {
  return projects.find((project) => project.id === projectId);
}

export function createProject(name: string, canvasNodes: CanvasNodeType[] = []) {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: `project-${Date.now()}`,
    name,
    canvasNodes,
    createdAt: now,
    updatedAt: now,
  };
  commit([project, ...projects]);
  return project;
}

export function renameProject(projectId: string, name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return;
  commit(projects.map((project) => (
    project.id === projectId
      ? { ...project, name: trimmedName, updatedAt: new Date().toISOString() }
      : project
  )));
}

export function duplicateProject(projectId: string, copyName?: string) {
  const source = getProjectRecord(projectId);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: ProjectRecord = {
    ...structuredClone(source),
    id: `project-${Date.now()}`,
    name: copyName || source.name,
    createdAt: now,
    updatedAt: now,
  };
  commit([copy, ...projects]);
  return copy;
}

export function deleteProject(projectId: string) {
  commit(projects.filter((project) => project.id !== projectId));
}

export function updateAutomaticProjectCover(
  projectId: string,
  cover: ProjectCoverCandidate | null,
) {
  const project = getProjectRecord(projectId);
  if (!project || project.coverSource === 'usedGenerated') return;
  if (project.thumbnail === cover?.thumbnail && project.coverSource === cover?.source) return;

  commit(projects.map((item) => (
    item.id === projectId
      ? {
          ...item,
          thumbnail: cover?.thumbnail,
          coverSource: cover?.source,
          updatedAt: new Date().toISOString(),
        }
      : item
  )));
}

export function markProjectCoverAsUsed(projectId: string, thumbnail: string) {
  if (!thumbnail) return;
  const project = getProjectRecord(projectId);
  if (!project) return;
  if (project.thumbnail === thumbnail && project.coverSource === 'usedGenerated') return;

  commit(projects.map((item) => (
    item.id === projectId
      ? {
          ...item,
          thumbnail,
          coverSource: 'usedGenerated',
          updatedAt: new Date().toISOString(),
        }
      : item
  )));
}
