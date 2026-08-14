import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  Copy,
  Grid2X2,
  ImageIcon,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  createProject,
  deleteProject,
  duplicateProject,
  getProjectRecord,
  renameProject,
  useProjectLibrary,
  type ProjectRecord,
} from '@/features/projects/projectLibrary';

type SortMode = 'updated' | 'created' | 'name';
type ViewMode = 'grid' | 'list';
type RenameState = { projectId: string; draft: string } | null;

const dropdownClass = 'w-48 border-white/[0.08] bg-[#252526] p-1.5 text-white shadow-2xl';
const itemClass = 'gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-white/72 focus:bg-white/[0.07] focus:text-white';

export default function ProjectLibrary() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const projects = useProjectLibrary();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [renameState, setRenameState] = useState<RenameState>(null);
  const renameStateRef = useRef<RenameState>(null);
  const renameTimerRef = useRef<number | null>(null);

  const updateRenameState = useCallback((nextState: RenameState) => {
    renameStateRef.current = nextState;
    setRenameState(nextState);
  }, []);

  const clearRenameTimer = useCallback(() => {
    if (renameTimerRef.current === null) return;
    window.clearTimeout(renameTimerRef.current);
    renameTimerRef.current = null;
  }, []);

  useEffect(() => () => clearRenameTimer(), [clearRenameTimer]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...projects]
      .filter((project) => project.name.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sortMode === 'created') return b.createdAt.localeCompare(a.createdAt);
        if (sortMode === 'name') return a.name.localeCompare(b.name, i18n.language);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [i18n.language, projects, query, sortMode]);

  const handleNewProject = () => {
    commitRename();
    const project = createProject(t('canvas.unnamedProject'));
    navigate(`/canvas/${project.id}`);
  };

  const commitRename = useCallback(() => {
    const currentRename = renameStateRef.current;
    if (!currentRename) return;
    updateRenameState(null);

    const project = getProjectRecord(currentRename.projectId);
    const nextName = currentRename.draft.trim();
    if (project && nextName && nextName !== project.name) renameProject(project.id, nextName);
  }, [updateRenameState]);

  const cancelRename = useCallback(() => {
    clearRenameTimer();
    updateRenameState(null);
  }, [clearRenameTimer, updateRenameState]);

  const startRename = useCallback((projectId: string) => {
    commitRename();
    clearRenameTimer();
    renameTimerRef.current = window.setTimeout(() => {
      renameTimerRef.current = null;
      const project = getProjectRecord(projectId);
      if (project) updateRenameState({ projectId, draft: project.name });
    }, 0);
  }, [clearRenameTimer, commitRename, updateRenameState]);

  const changeRenameDraft = useCallback((projectId: string, draft: string) => {
    if (renameStateRef.current?.projectId !== projectId) return;
    updateRenameState({ projectId, draft });
  }, [updateRenameState]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar variant="projects" />
      <main className="mx-auto max-w-[1680px] px-5 pb-12 pt-20 md:px-8">
        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('projectLibrary.title')}</h1>
            <p className="mt-1 text-sm text-white/42">{t('projectLibrary.subtitle', { count: projects.length })}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-white/[0.09] bg-[#14141a] px-3 text-white/45 focus-within:border-[#8b5cf6]/55 xl:flex-none">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('projectLibrary.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
              />
            </label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 border-white/[0.09] bg-[#14141a] text-white/72 hover:bg-[#1e1e28] hover:text-white">
                  {t(`projectLibrary.sort.${sortMode}`)}<ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={dropdownClass}>
                {(['updated', 'created', 'name'] as const).map((mode) => (
                  <DropdownMenuItem key={mode} onSelect={() => setSortMode(mode)} className={itemClass}>
                    <span className="flex-1">{t(`projectLibrary.sort.${mode}`)}</span>
                    {sortMode === mode && <Check className="text-[#a78bfa]" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex h-9 items-center rounded-lg border border-white/[0.09] bg-[#14141a] p-1">
              <button onClick={() => setViewMode('grid')} aria-label={t('projectLibrary.view.grid')} className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#8b5cf6]/18 text-[#c4b5fd]' : 'text-white/42 hover:text-white/72'}`}>
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('list')} aria-label={t('projectLibrary.view.list')} className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#8b5cf6]/18 text-[#c4b5fd]' : 'text-white/42 hover:text-white/72'}`}>
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={handleNewProject} className="h-9 bg-[#8b5cf6] text-white hover:bg-[#7c3aed]">
              <Plus />{t('projectLibrary.newProject')}
            </Button>
          </div>
        </div>

        {visibleProjects.length > 0 ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
            : 'grid grid-cols-1 gap-3 lg:grid-cols-2'}>
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                renameState={renameState}
                onRenameDraftChange={(draft) => changeRenameDraft(project.id, draft)}
                onStartRename={() => startRename(project.id)}
                onCommitRename={commitRename}
                onCancelRename={cancelRename}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-[#14141a]/45 text-center">
            <Search className="mb-3 h-8 w-8 text-white/22" />
            <p className="text-sm text-white/55">{t('projectLibrary.noResults')}</p>
          </div>
        )}
      </main>
    </div>
  );
}

type ProjectCardProps = {
  project: ProjectRecord;
  viewMode: ViewMode;
  renameState: RenameState;
  onRenameDraftChange: (draft: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
};

function ProjectCard({
  project,
  viewMode,
  renameState,
  onRenameDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
}: ProjectCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameRequestedFromMenuRef = useRef(false);
  const renaming = renameState?.projectId === project.id;
  const nameDraft = renaming ? renameState.draft : project.name;

  useEffect(() => {
    if (!renaming) return;
    const animationFrame = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [renaming]);

  const handleDelete = () => {
    if (window.confirm(t('projectLibrary.deleteConfirm', { name: project.name }))) {
      deleteProject(project.id);
    }
  };

  return (
    <article className={`group min-w-0 ${viewMode === 'list' ? 'flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#14141a] p-2 transition-colors hover:border-white/[0.14] hover:bg-[#18181f]' : ''}`}>
      <button
        onClick={() => navigate(`/canvas/${project.id}`)}
        className={`relative block overflow-hidden rounded-xl border border-white/[0.08] bg-[#14141a] text-left transition-colors group-hover:border-white/[0.18] ${viewMode === 'list' ? 'h-24 w-40 flex-none' : 'aspect-[16/10] w-full'}`}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#18181f] text-white/30">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">{t('projectLibrary.emptyProject')}</span>
          </div>
        )}
      </button>

      <div className={`flex min-w-0 items-start justify-between gap-2 ${viewMode === 'list' ? 'flex-1 pr-2' : 'mt-2.5 px-0.5'}`}>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              ref={renameInputRef}
              autoFocus
              aria-label={t('common.rename')}
              value={nameDraft}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => onRenameDraftChange(event.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onCommitRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  onCancelRename();
                }
              }}
              className="h-7 w-full rounded-md border border-[#8b5cf6]/55 bg-[#1e1e28] px-2 text-sm text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={onStartRename}
              className="block w-full truncate text-left text-sm font-medium text-white/88 outline-none transition-colors hover:text-white focus-visible:text-white"
              aria-label={`${t('common.rename')} ${project.name}`}
            >
              {project.name}
            </button>
          )}
          <p className="mt-1 text-xs text-white/35">
            {t('projectLibrary.updatedAt', { date: new Date(project.updatedAt).toLocaleDateString(i18n.language) })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label={t('common.more')} className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={dropdownClass}
            onCloseAutoFocus={(event) => {
              if (!renameRequestedFromMenuRef.current) return;
              event.preventDefault();
              renameRequestedFromMenuRef.current = false;
            }}
          >
            <DropdownMenuItem
              onSelect={() => {
                renameRequestedFromMenuRef.current = true;
                onStartRename();
              }}
              className={itemClass}
            >
              <Pencil />{t('common.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicateProject(project.id, `${project.name} ${t('projectLibrary.copySuffix')}`)} className={itemClass}>
              <Copy />{t('common.createCopy')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className={`${itemClass} text-red-400 focus:text-red-300`}>
              <Trash2 />{t('recentProjects.deleteProject')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
