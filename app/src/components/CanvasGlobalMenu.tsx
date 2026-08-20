import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  Copy,
  Download,
  FolderKanban,
  History,
  House,
  ImagePlus,
  Pencil,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CanvasNavigationActions {
  onNewProject?: () => void;
  onImportImage?: () => void;
  onOpenHistory?: () => void;
  onRenameProject?: (name: string) => void;
  onDuplicateProject?: () => void;
  onExportProject?: () => void;
}

const menuContentClass = 'w-56 border-white/[0.08] bg-[#252526] p-1.5 text-white shadow-2xl';
const menuItemClass = 'gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-white/72 focus:bg-white/[0.07] focus:text-white data-[disabled]:opacity-35';

export function VisionerGlobalMenu({ actions }: { actions?: CanvasNavigationActions }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isProjects = location.pathname.startsWith('/projects');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('globalMenu.open')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.10] bg-[#1e1e28] text-sm font-bold text-white transition-colors hover:border-[#8b5cf6]/60 hover:bg-[#252530]"
        >
          V
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className={menuContentClass}>
        <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-1.5 text-[13px] font-semibold text-white/90">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.10] bg-[#1e1e28] text-[11px] font-bold text-white">
            V
          </span>
          <span>Visioner</span>
        </div>
        <DropdownMenuItem onSelect={() => navigate('/')} className={`${menuItemClass} ${isHome ? 'bg-[#8b5cf6]/12 text-[#c4b5fd]' : ''}`}>
          <House />{t('globalMenu.home')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/projects')} className={`${menuItemClass} ${isProjects ? 'bg-[#8b5cf6]/12 text-[#c4b5fd]' : ''}`}>
          <FolderKanban />{t('globalMenu.projects')}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-2 bg-white/[0.08]" />
        <DropdownMenuItem onSelect={() => {
          if (actions?.onNewProject) actions.onNewProject();
          else navigate('/canvas/new');
        }} className={menuItemClass}>
          <Plus />{t('globalMenu.newProject')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!actions?.onImportImage} onSelect={actions?.onImportImage} className={menuItemClass}>
          <ImagePlus />{t('globalMenu.importImage')}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-2 bg-white/[0.08]" />
        <DropdownMenuItem disabled={!actions?.onOpenHistory} onSelect={actions?.onOpenHistory} className={menuItemClass}>
          <History />{t('globalMenu.historyAssets')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CurrentProjectMenu({
  projectName,
  actions,
}: {
  projectName: string;
  actions?: CanvasNavigationActions;
}) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);

  const commitRename = () => {
    if (nameDraft.trim() && nameDraft.trim() !== projectName) {
      actions?.onRenameProject?.(nameDraft.trim());
    } else {
      setNameDraft(projectName);
    }
    setRenaming(false);
  };

  if (renaming) {
    return (
      <input
        autoFocus
        value={nameDraft}
        aria-label={t('projectLibrary.renamePrompt')}
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={commitRename}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitRename();
          if (event.key === 'Escape') {
            setNameDraft(projectName);
            setRenaming(false);
          }
        }}
        className="h-9 w-[240px] rounded-lg border border-[#8b5cf6]/55 bg-[#1e1e28] px-3 text-sm text-white outline-none"
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 max-w-[320px] items-center gap-1.5 rounded-lg px-2.5 text-sm text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white">
          <span className="truncate">{projectName || t('common.unnamed')}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className={menuContentClass}>
        <DropdownMenuItem disabled={!actions?.onRenameProject} onSelect={() => {
          setNameDraft(projectName);
          setRenaming(true);
        }} className={menuItemClass}>
          <Pencil />{t('common.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!actions?.onDuplicateProject} onSelect={actions?.onDuplicateProject} className={menuItemClass}>
          <Copy />{t('common.createCopy')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!actions?.onExportProject} onSelect={actions?.onExportProject} className={menuItemClass}>
          <Download />{t('projectLibrary.exportProject')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
