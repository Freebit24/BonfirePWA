'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Search, 
  PlusCircle, 
  Bell, 
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: PlusCircle, label: 'Create', href: '/organizer/create' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: User, label: 'Profile', href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto p-2 text-xs",
                isActive && "text-orange-500"
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className={cn(
                "h-5 w-5",
                isActive && "text-orange-500"
              )} />
              <span className={cn(
                "text-xs",
                isActive && "text-orange-500 font-medium"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}