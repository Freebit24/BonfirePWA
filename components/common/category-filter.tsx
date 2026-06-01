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
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(null)}
            className={cn(
              "whitespace-nowrap",
              selectedCategory === null && "bg-gradient-to-r from-orange-500 to-red-500 text-white"
            )}
          >
            All Events
          </Button>
          
          {EVENT_CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category.value)}
              className={cn(
                "whitespace-nowrap",
                selectedCategory === category.value && "bg-gradient-to-r from-orange-500 to-red-500 text-white"
              )}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </Button>
          ))}
        </div>

        {/* Tags row */}
        {tagsList.length > 0 && (
          <div className="flex gap-2 items-center pb-2">
            <div className="text-sm font-medium mr-2">Tags:</div>
            <div className="flex gap-2 flex-wrap">
              {tagsList.map(tag => (
                <Button
                  key={tag}
                  size="sm"
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  onClick={() => toggleTag(tag)}
                  className={cn("whitespace-nowrap")}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Date sort controls */}
        <div className="flex gap-2 items-center pb-2">
          <div className="text-sm font-medium mr-2">Sort by date:</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={dateSort === 'newest' ? 'default' : 'outline'}
              onClick={() => setDateSort('newest')}
            >
              Newest
            </Button>
            <Button
              size="sm"
              variant={dateSort === 'oldest' ? 'default' : 'outline'}
              onClick={() => setDateSort('oldest')}
            >
              Oldest
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
