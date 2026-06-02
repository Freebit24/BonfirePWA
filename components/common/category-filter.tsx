'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventCategory } from '@/types';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selectedCategory: EventCategory | null;
  onCategoryChange: (category: EventCategory | null) => void;
  tagsList?: string[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  dateSort?: 'newest' | 'oldest' | null;
  onDateSortChange?: (sort: 'newest' | 'oldest' | null) => void;
  className?: string;
}

export function CategoryFilter({ 
  selectedCategory, 
  onCategoryChange, 
  tagsList = [],
  selectedTags = [],
  onTagsChange,
  dateSort = 'newest',
  onDateSortChange,
  className 
}: CategoryFilterProps) {
  const toggleTag = (tag: string) => {
    if (!onTagsChange) return;
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const setDateSort = (sort: 'newest' | 'oldest' | null) => {
    onDateSortChange?.(sort);
  };

  return (
    <div className={cn("w-full", className)}>
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade lg:gap-3">
          {/* All Events Chip */}
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] flex items-center",
              selectedCategory === null
                ? "bg-white text-black font-semibold shadow-md"
                : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            )}
          >
            All Events
          </button>
          
          {/* Category Chips */}
          {EVENT_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => onCategoryChange(category.value)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-[44px]",
                selectedCategory === category.value
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
              )}
            >
              <span className="text-base">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}

          {/* Tags Chips */}
          {tagsList.length > 0 && selectedTags.length === 0 && (
            <div className="text-slate-500 text-sm mx-1 lg:mx-2">|</div>
          )}
          {tagsList.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] flex items-center",
                selectedTags.includes(tag)
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
