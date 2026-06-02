'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  Heart,
  CreditCard,
  Settings,
  Bell,
  CalendarClock,
  MapPin,
  Link as LinkIcon,
  Lock,
  Wallet,
  Mail,
} from 'lucide-react';
import AccountSettings from './account-settings';

const PREFERENCES_STORAGE_KEY = 'bonfire:preferences';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('account');
  const [preferences, setPreferences] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    locationSharing: true,
    calendarSync: true,
    reminderLeadTime: '30' as '15' | '30' | '60' | '180',
    profileVisibility: 'friends' as 'public' | 'friends' | 'private',
  });
  const [payments, setPayments] = useState({
    defaultMethod: 'visa' as 'visa' | 'mastercard' | 'paypal' | 'upi',
    billingEmail: user?.email || '',
    saveReceipts: true,
    autoPayRecurring: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setPreferences((prev) => ({ ...prev, ...parsed }));
    } catch (err) {
      console.error('Failed to parse stored preferences', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-32 md:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account preferences and settings
            </p>
          </motion.div>

          {/* Settings Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex gap-8 border-b border-white/10 w-full mb-6 overflow-x-auto no-scrollbar">
                <TabsList className="flex gap-8 border-b border-0 bg-transparent w-full p-0 h-auto">
                  <TabsTrigger value="account" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none flex items-center gap-2 whitespace-nowrap">
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none flex items-center gap-2 whitespace-nowrap">
                    <Heart className="h-4 w-4" />
                    <span>Preferences</span>
                  </TabsTrigger>
                  {/* <TabsTrigger value="payment" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden sm:inline">Payment</span>
                  </TabsTrigger> */}
                </TabsList>
              </div>

              {/* Account Settings Tab */}
              <TabsContent value="account" className="mt-6">
                <AccountSettings />
              </TabsContent>

              {/* Preferences Settings Tab */}
              <TabsContent value="preferences" className="mt-6">
                <div className="grid grid-cols-1 gap-6">
                  <Card className="bg-white/5 border border-white/10 rounded-xl">
                    <CardHeader className="p-6">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Settings className="h-4 w-4" /> Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6 pt-0">
                      <div className="space-y-3 rounded-lg border border-dashed dark:border-gray-800 p-3">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <p className="font-medium">Notifications</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Push alerts</span>
                          <Switch
                            checked={preferences.pushNotifications}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, pushNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Email updates</span>
                          <Switch
                            checked={preferences.emailNotifications}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, emailNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">SMS reminders</span>
                          <Switch
                            checked={preferences.smsNotifications}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, smsNotifications: checked }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Reminders</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">How early to remind you before events.</p>
                        </div>
                        <Select
                          value={preferences.reminderLeadTime}
                          onValueChange={(value: '15' | '30' | '60' | '180') =>
                            setPreferences((prev) => ({ ...prev, reminderLeadTime: value }))
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="180">3 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4" /> Location sharing</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Enable better nearby event suggestions.</p>
                        </div>
                        <Switch
                          checked={preferences.locationSharing}
                          onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, locationSharing: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-1"><LinkIcon className="h-4 w-4" /> Calendar sync</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Keep Google/Outlook calendars in sync.</p>
                        </div>
                        <Switch
                          checked={preferences.calendarSync}
                          onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, calendarSync: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium flex items-center gap-1"><Lock className="h-4 w-4" /> Profile visibility</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Control who can see your profile.</p>
                        </div>
                        <Select
                          value={preferences.profileVisibility}
                          onValueChange={(value: 'public' | 'friends' | 'private') =>
                            setPreferences((prev) => ({ ...prev, profileVisibility: value }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="friends">Friends</SelectItem>
                            <SelectItem value="private">Only me</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Payment Settings Tab */}
              {/* <TabsContent value="payment" className="mt-6">
                <div className="grid grid-cols-1 gap-6">
                  <Card className="bg-white/5 border border-white/10 rounded-xl">
                    <CardHeader className="p-6">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Wallet className="h-4 w-4" /> Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6 pt-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Default method</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Used for paid or ticketed events.</p>
                        </div>
                        <Select
                          value={payments.defaultMethod}
                          onValueChange={(value: 'visa' | 'mastercard' | 'paypal' | 'upi') =>
                            setPayments((prev) => ({ ...prev, defaultMethod: value }))
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visa">Visa •••• 4242</SelectItem>
                            <SelectItem value="mastercard">Mastercard •••• 1881</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium flex items-center gap-1"><Mail className="h-4 w-4" /> Billing email</p>
                        <Input
                          value={payments.billingEmail}
                          onChange={(e) => setPayments((prev) => ({ ...prev, billingEmail: e.target.value }))}
                          placeholder="billing@example.com"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Save receipts</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Email me receipts for every purchase.</p>
                        </div>
                        <Switch
                          checked={payments.saveReceipts}
                          onCheckedChange={(checked) => setPayments((prev) => ({ ...prev, saveReceipts: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Auto-pay recurring events</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Automatically renew recurring bookings.</p>
                        </div>
                        <Switch
                          checked={payments.autoPayRecurring}
                          onCheckedChange={(checked) => setPayments((prev) => ({ ...prev, autoPayRecurring: checked }))}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm">
                          <Wallet className="h-4 w-4 mr-2" /> Manage cards
                        </Button>
                        <Button variant="outline" size="sm">
                          <LinkIcon className="h-4 w-4 mr-2" /> Connect PayPal/UPI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent> */}
            </Tabs>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
