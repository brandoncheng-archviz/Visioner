import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, FolderOpen, Copy, Trash2 } from 'lucide-react';
import { recentProjects } from '../data/siteData';

export default function RecentProjects() {
  const navigate = useNavigate();
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <section className="px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">最近项目</h2>
        <button className="text-sm text-[#00d4ff] hover:brightness-110 transition-all flex items-center gap-0.5">
          全部项目
          <span className="text-xs">&gt;</span>
        </button>
      </div>

      {/* Cards */}
      <div className="flex gap-4">
        {recentProjects.map((project) => (
          <div
            key={project.id}
            className="relative flex-shrink-0 w-56 cursor-pointer group"
            onMouseEnter={() => setHoveredProject(project.id)}
            onMouseLeave={() => {
              setHoveredProject(null);
              setActiveMenu(null);
            }}
          >
            {project.isCreateNew ? (
              /* Create New Card */
              <div
                onClick={() => navigate('/canvas/new')}
                className="w-full aspect-[3/2] rounded-xl flex flex-col items-center justify-center transition-all duration-300"
                style={{
                  background: hoveredProject === project.id
                    ? 'rgba(0, 212, 255, 0.05)'
                    : '#14141a',
                  border: hoveredProject === project.id
                    ? '1px dashed rgba(0, 212, 255, 0.5)'
                    : '1px dashed #2a2a35',
                }}
              >
                <Plus
                  className="w-8 h-8 mb-2 transition-colors duration-300"
                  style={{
                    color: hoveredProject === project.id ? '#00d4ff' : '#6a6a7a',
                  }}
                />
                <span
                  className="text-xs transition-colors duration-300"
                  style={{
                    color: hoveredProject === project.id ? '#00d4ff' : '#6a6a7a',
                  }}
                >
                  {project.name}
                </span>
              </div>
            ) : (
              /* Project Card */
              <div onClick={() => navigate(`/canvas/${project.id}`)}>
                <div
                  className="w-full aspect-[3/2] rounded-xl overflow-hidden relative transition-all duration-300"
                  style={{
                    background: '#14141a',
                    border: '1px solid #2a2a35',
                    transform: hoveredProject === project.id ? 'translateY(-2px)' : 'none',
                    boxShadow: hoveredProject === project.id
                      ? '0 8px 24px rgba(0,0,0,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 bg-black/30 transition-opacity duration-300"
                    style={{ opacity: hoveredProject === project.id ? 1 : 0 }}
                  />
                  {/* More button */}
                  <div
                    className="absolute top-2 right-2 transition-opacity duration-200"
                    style={{ opacity: hoveredProject === project.id ? 1 : 0 }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === project.id ? null : project.id);
                      }}
                      className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeMenu === project.id && (
                      <div
                        className="absolute right-0 top-9 w-36 py-1.5 rounded-lg z-10"
                        style={{
                          background: '#252526',
                          border: '1px solid #2a2a35',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}
                      >
                        <button className="w-full px-3 py-1.5 text-left text-xs text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-[#e0e0e0]" />
                          打开
                        </button>
                        <button className="w-full px-3 py-1.5 text-left text-xs text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-[#e0e0e0]" />
                          重命名
                        </button>
                        <button className="w-full px-3 py-1.5 text-left text-xs text-[#a0a0b0] hover:bg-[#1e1e28] hover:text-white transition-colors flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-[#e0e0e0]" />
                          创建副本
                        </button>
                        <button className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[#1e1e28] hover:text-red-300 transition-colors flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-[#e0e0e0]" />
                          删除项目
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <h3 className="text-sm text-white font-medium">{project.name}</h3>
                  {project.date && (
                    <span className="text-xs text-[#6a6a7a]">{project.date}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
