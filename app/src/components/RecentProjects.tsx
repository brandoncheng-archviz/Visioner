import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { useProjectLibrary } from '@/features/projects/projectLibrary';

export default function RecentProjects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projects = [...useProjectLibrary()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <section className="px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{t('recentProjects.recentProjects')}</h2>
        <button onClick={() => navigate('/projects')} className="text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors flex items-center gap-0.5">
          {t('recentProjects.allProjects')}
          <span className="text-xs">&gt;</span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {projects.map((project) => (
          <button key={project.id} onClick={() => navigate(`/canvas/${project.id}`)} className="group min-w-0 text-left">
            <div className="aspect-[3/2] overflow-hidden rounded-xl border border-[#2a2a35] bg-[#14141a] transition-colors group-hover:border-white/20 group-hover:bg-[#1e1e28]">
              {project.thumbnail ? (
                <img src={project.thumbnail} alt={project.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#18181f] text-[#6a6a7a]">
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-xs">{t('projectLibrary.emptyProject')}</span>
                </div>
              )}
            </div>
            <div className="mt-2 px-0.5">
              <h3 className="truncate text-sm font-medium text-white">{project.name}</h3>
              <span className="text-xs text-[#6a6a7a]">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
