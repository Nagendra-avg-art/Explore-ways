import React from 'react';
import { TRAVEL_CATEGORIES } from '../data/demoPlaces';
import { CategoryId } from '../types/travel';

interface CategoryPillsProps {
  selectedCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
            Browse by Interest
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Popular Categories
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Swipe to explore
        </span>
      </div>

      {/* Horizontal Scrollable Category Carousel */}
      <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 scroll-smooth">
        {TRAVEL_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 border min-h-[44px] ${
                isActive
                  ? `${cat.bgActive} shadow-sm scale-102 font-bold`
                  : `${cat.accentColor} hover:bg-slate-50 hover:border-slate-300 shadow-2xs`
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
