import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { galleryData, galleryCategories } from '../data/siteData';

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return galleryData.filter((item) => {
      const matchCategory = activeCategory === '全部' || item.category === activeCategory;
      const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <section className="px-4 md:px-6 pb-12">
      {/* Title */}
      <h2 className="text-lg font-semibold text-white mb-4">作品库</h2>

      {/* Category bar + Search */}
      <div className="flex items-center gap-3 mb-5 relative">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
          {galleryCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                background: activeCategory === category ? 'rgba(0, 212, 255, 0.15)' : '#1e1e28',
                color: activeCategory === category ? '#00d4ff' : '#a0a0b0',
                border: activeCategory === category
                  ? '1px solid rgba(0, 212, 255, 0.3)'
                  : '1px solid #2a2a35',
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a7a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索作品或设计师"
            className="w-48 h-9 pl-9 pr-3 rounded-lg text-xs text-white placeholder:text-[#6a6a7a] outline-none transition-all focus:ring-1 focus:ring-[#00d4ff]/30"
            style={{
              background: '#1e1e28',
              border: '1px solid #2a2a35',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group cursor-pointer"
          >
            <div
              className="relative aspect-video rounded-lg overflow-hidden transition-all duration-400"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <img
                src={item.cover}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.03]"
              />
              {/* Bottom gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Play icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <img
                src={item.authorAvatar}
                alt={item.author}
                className="w-5 h-5 rounded-full flex-shrink-0"
              />
              <span className="text-xs text-[#a0a0b0] truncate">{item.author}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-[#6a6a7a]">暂无作品</p>
        </div>
      )}
    </section>
  );
}
