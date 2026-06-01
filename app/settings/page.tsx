'use client';

import { useState } from 'react';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  User,
  Heart,
  CreditCard,
} from 'lucide-react';
import AccountSettings from './account-settings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
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
              <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                <TabsTrigger value="account" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Preferences</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Payment</span>
                </TabsTrigger>
              </TabsList>

              {/* Account Settings Tab */}
              <TabsContent value="account" className="mt-6">
                <AccountSettings />
              </TabsContent>

              {/* Preferences Settings Tab */}
              <TabsContent value="preferences" className="mt-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    Preferences
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Preferences settings coming soon...
                  </p>
                </div>
              </TabsContent>

              {/* Payment Settings Tab */}
              <TabsContent value="payment" className="mt-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    Payment Methods
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Payment settings coming soon...
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
