'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search events...",
  className,
  inputClassName,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            // Premium dark-mode input styling
            "pl-10 pr-10 transition-all duration-200 bg-slate-800/50 border border-white/10 rounded-xl h-12 text-slate-300 placeholder:text-slate-500",
            // Focus: emphasize border without heavy ring
            isFocused && "border-orange-500",
            inputClassName
          )}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}