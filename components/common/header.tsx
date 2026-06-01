'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import {
  Bell,
  Settings,
  LogOut,
  User,
  Menu,  
  Search,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const menuItems = [
    { label: 'Home', href: '/home' },
    { label: 'Organizer', href: '/organizer' },
    { label: 'Profile', href: '/profile' },
    { label: 'Notifications', href: '/notifications' },
    { label: 'Help', href: '/help' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/home')}
        >
          <Image
            src="/bonfire-logo.png"
            alt="Bonfire Logo"
            width={48}
            height={48}
            className="rounded-md shadow-sm"
          />
          <span className="font-bold text-xl bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Bonfire
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              onClick={() => router.push(item.href)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {item.label}
            </Button>
          ))}
        </nav>

    
        <div className="flex items-center gap-3">

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/notifications')}
            className="hidden md:flex"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/home')}
            className="hidden md:flex"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/organizer/create')}
            className="hidden md:flex"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="z-[9999] w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-4 mt-6">
                {menuItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      router.push(item.href);
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="justify-start text-red-600"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
