'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Search, 
  PlusCircle, 
  Bell, 
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/notificationStore';

const navItems = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Calendar, label: 'Calendar', href: '/calendar' },
  { icon: PlusCircle, label: 'Create', href: '/organizer/create' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: User, label: 'Profile', href: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications } = useNotificationStore();
  const hasUnread = notifications.some(n => !n.read);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-1.5 py-1.5 min-h-[56px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto p-2 text-xs min-w-[44px] min-h-[44px]",
                isActive && "text-orange-500"
              )}
              onClick={() => router.push(item.href)}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "text-orange-500"
                )} />
                {item.href === '/notifications' && hasUnread && (
<span className="absolute top-[17%] left-[50%] h-2.5 w-2.5 rounded-full bg-red-600 shadow-sm" />                )}
              </div>
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