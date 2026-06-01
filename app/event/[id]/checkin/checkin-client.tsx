'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { generateQRCode } from '@/utils/helpers';
import { toast } from 'sonner';
import { CheckCircle, QrCode, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

export default function CheckInClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedEvent, fetchEventById } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId).then(() => setLoading(false));
    }
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (user && selectedEvent) {
      const qrData = generateQRCode(selectedEvent.id, user.id);
      QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl);
    }
  }, [user, selectedEvent]);

  const handleCheckIn = () => {
    setCheckedIn(true);
    toast.success('Successfully checked in to the event!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!selectedEvent || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Event Check-In</h1>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{selectedEvent.title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedEvent.location}
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {checkedIn ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                        Checked In Successfully!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        You're all set for the event. Enjoy!
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <QrCode className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Your Check-In QR Code</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Show this QR code to the event organizer to check in
                      </p>
                    </div>
                    {qrCodeUrl && (
                      <div className="p-4 bg-white rounded-lg border">
                        <img
                          src={qrCodeUrl}
                          alt="Check-in QR Code"
                          className="mx-auto w-48 h-48"
                        />
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      QR Code ID: {generateQRCode(selectedEvent.id, user.id).slice(-8)}
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      onClick={handleCheckIn}
                    >
                      Simulate Check-In
                    </Button>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/event/${selectedEvent.id}`)}
                  >
                    Back to Event Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}