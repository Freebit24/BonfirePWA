'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

import {
  Bell,
  Settings,
  LogOut,
  User,
  Menu,
  Search,
  Plus,
  HelpCircle,
} from 'lucide-react';

import SocialIconsCompact from '@/components/ui/SocialIconsCompact';

export function Header() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (user && notifications.length === 0) {
      fetchNotifications(user.id).catch(() => {});
    }
  }, [user, notifications.length, fetchNotifications]);

  const hasUnread = notifications.some(n => !n.read);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const menuItems = [
    { label: 'Home', href: '/home' },
    { label: 'Organizer', href: '/organizer' },
    { label: 'Calendar', href: '/calendar' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md overflow-x-clip">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-neutral-200">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/home')}
        >
          <Image
            src="/app/bonfire-logo-96.webp"
            alt="Bonfire Logo"
            width={48}
            height={48}
            priority
            sizes="48px"
            className="rounded-md shadow-sm"
          />
          <span className="font-bold text-xl bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Bonfire
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          {menuItems.map(item => (
            <Button
              key={item.href}
              variant="ghost"
              onClick={() => router.push(item.href)}
              className="text-neutral-300 hover:text-white"
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/notifications')}
            className="hidden md:flex relative text-neutral-300 hover:text-white"
          >
            {hasUnread && (
              <span className="absolute top-[17%] left-[50%] h-2.5 w-2.5 rounded-full bg-red-600 shadow-sm" />
            )}
            <Bell className="h-5 w-5" />
          </Button>

          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/home')}
            className="hidden md:flex text-neutral-300 hover:text-white"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Create */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/organizer/create')}
            className="hidden md:flex text-neutral-300 hover:text-white"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="min-h-10 min-w-10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.user_metadata?.name?.[0] ||
                      user?.email?.[0] ||
                      'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">

              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.push('/help')}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Social section */}
              <div className="px-2 py-2">
                <p className="px-1 pb-2 text-xs text-gray-400">
                  Connect with us
                </p>
                <SocialIconsCompact />
              </div>

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
              <Button variant="ghost" size="sm" className="md:hidden min-h-10 min-w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-4 mt-6">
                {menuItems.map(item => (
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
      {/* Spacer to offset the fixed header height so page content starts below */}
      <div className="h-16" aria-hidden />
    </>
  );
}