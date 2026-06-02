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
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 z-50 md:hidden pb-[env(safe-area-inset-bottom)] pb-5">
      <div className="flex items-center justify-around px-6 py-2 min-h-[60px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isCreate = item.href === '/organizer/create';
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "group flex flex-col items-center gap-1 h-auto p-2 text-[10px] min-w-[48px] min-h-[48px] text-gray-500 hover:text-gray-300",
                isActive && "text-orange-500",
                isCreate && "p-0"
              )}
              onClick={() => router.push(item.href)}
            >
              {isCreate ? (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 to-orange-400 shadow-lg shadow-orange-500/30 flex items-center justify-center p-0">
                  <Icon className="h-6 w-6 text-white" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon className={cn(
                      "h-5 w-5 text-gray-500 group-hover:text-gray-300",
                      isActive && "text-orange-500"
                    )} />
                    {item.href === '/notifications' && hasUnread && (
                      <span className="absolute top-[1%] left-[50%] h-2.5 w-2.5 rounded-full bg-red-600 shadow-sm" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isActive && "text-orange-500 font-medium"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}