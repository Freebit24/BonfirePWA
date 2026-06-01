'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Search,
  ChevronRight
} from 'lucide-react';

const faqData = [
  {
    question: "How do I create an event?",
    answer: "To create an event, go to the Organizer Dashboard and click 'Create Event'. Fill in all the required details including title, description, location, date, and time. You can also add tags and set a maximum number of attendees."
  },
  {
    question: "How do I join an event?",
    answer: "Browse events on the Home page using the map or list view. Click on any event to view details, then click the 'Join Event' button. You'll receive a confirmation and can access your QR code for check-in."
  },
  {
    question: "What is the QR code check-in feature?",
    answer: "Each event you join generates a unique QR code that serves as your digital ticket. Show this QR code to the event organizer when you arrive to confirm your attendance."
  },
  {
    question: "Can I edit or cancel my event?",
    answer: "Yes, as an event organizer, you can edit or cancel your events from the Organizer Dashboard. Click the edit icon on any of your events to make changes or use the delete button to cancel."
  },
  {
    question: "How do I search for specific events?",
    answer: "Use the search bar on the Home page to find events by title, description, or location. You can also filter events by category using the category filter buttons."
  },
  {
    question: "What happens if an event is cancelled?",
    answer: "If an event is cancelled, all attendees will receive a notification. The event will be marked as 'Cancelled' and removed from active event listings."
  },
  {
    question: "How do I change my profile information?",
    answer: "Go to your Profile page and click 'Edit Profile'. You can update your name, profile picture, and other personal information from there."
  },
  {
    question: "Can I see who else is attending an event?",
    answer: "Currently, you can see the total number of attendees for each event. Individual attendee lists are only visible to event organizers for privacy reasons."
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle contact form submission
    console.log('Contact form submitted:', contactForm);
    // Reset form
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

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
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold mb-4">Help & Support</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Find answers to common questions or get in touch with our support team
            </p>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold mb-2">FAQ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Find quick answers to common questions
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Live Chat not available</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Do not Chat with our support team
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send us a detailed message
                </p>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              
              {/* Search FAQ */}
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
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-400">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              {filteredFAQ.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No FAQ items match your search. Try different keywords or contact support.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Contact Support</CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                Can't find what you're looking for? Send us a message and we'll get back to you.
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                  <Input
                    id="subject"
                    placeholder="What's this about?"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue or question in detail..."
                    rows={6}
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You can also reach us directly:
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">bonfireglobal@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">+91 9257184876, +91 9257317811</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}