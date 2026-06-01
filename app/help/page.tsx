'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  HelpCircle,
  Mail,
  Search,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const faqData = [
  {
    question: 'How do I create an event?',
    answer:
      "Go to the Organizer Dashboard and click 'Create Event'. Fill in the required details such as title, description, location, date, and time."
  },
  {
    question: 'How do I join an event?',
    answer:
      "Browse events on the Home page using the map or list view. Open an event and click 'Join Event' to participate."
  },
  {
    question: 'Can I edit or cancel my event?',
    answer:
      'Yes. Organizers can edit or cancel events from the Organizer Dashboard.'
  },
  {
    question: 'How do I search for specific events?',
    answer:
      'Use the search bar or filters on the Home page to find events by title, category, or location.'
  },
  {
    question: 'What happens if an event is cancelled?',
    answer:
      'Attendees are notified, and the event is marked as cancelled and removed from active listings.'
  },
  {
    question: 'How do I change my profile information?',
    answer:
      'Go to your Profile page and use the Edit Profile option to update your details.'
  },
  {
    question: 'Can I see who else is attending an event?',
    answer:
      'Only the total attendee count is visible to participants. Full attendee lists are available only to organizers.'
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    if (loading) {
      initialize().catch(() => {});
    }
  }, [loading, initialize]);

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToFAQ = () => {
    document.getElementById('faq-section')?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-transparent">
      {user ? (
        <Header />
      ) : (
        <header className="mx-auto max-w-4xl px-4 md:px-6 pt-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Go back"
            >
              ← Back
            </button>
            <Link
              href="/"
              className="text-sm font-semibold tracking-wide text-neutral-300 hover:text-white transition-colors"
              aria-label="Bonfire home"
            >
              Bonfire
            </Link>
          </div>
          <div className="mt-4 border-b border-white/10" />
        </header>
      )}

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl font-bold mb-3">Help & Support</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Find answers to common questions or get in touch with us
            </p>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card
              onClick={scrollToFAQ}
              className="border-0 shadow-lg hover:shadow-xl transition cursor-pointer"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold mb-2">FAQ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick answers to common questions
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => window.location.href = 'mailto:bonfireglobal@gmail.com'}
              className="border-0 shadow-lg hover:shadow-xl transition cursor-pointer"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email is the fastest way to reach us
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => window.location.href = '/community-guidelines'}
              className="border-0 shadow-lg hover:shadow-xl transition cursor-pointer"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Community Guidelines</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Learn about rules and safety standards
                </p>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card id="faq-section" className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl mb-4">
                Frequently Asked Questions
              </CardTitle>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search FAQ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFAQ.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`faq-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filteredFAQ.length === 0 && (
                <p className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No matching questions found. Try different keywords or email us.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="mt-10 text-center text-sm text-gray-600 dark:text-gray-400">
            Need more help? Email us at{' '}
            <a
              href="mailto:bonfireglobal@gmail.com"
              className="underline"
            >
              bonfireglobal@gmail.com
            </a>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}