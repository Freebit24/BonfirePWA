'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { auth } from '@/utils/supabase';

export interface AiGeneratedData {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  date?: string;
  time?: string;
  end_date?: string;
  end_time?: string;
  tags?: string[];
  max_attendees?: number | null;
  is_private?: boolean;
  require_approval?: boolean;
}

export interface AiEventGeneratorProps {
  onGenerate: (data: AiGeneratedData) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiEventGenerator({ onGenerate, isOpen, onOpenChange }: AiEventGeneratorProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please describe your event');
      return;
    }

    setLoading(true);
    try {
      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/ai/generate-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate event');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        onGenerate(result.data);
        toast.success('Event details generated! Review and edit as needed.');
        setDescription('');
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'No data returned');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate event details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <DialogTitle>AI Event Creator</DialogTitle>
          </div>
          <DialogDescription>
            Describe your event in natural language and AI will populate the form fields for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe your event
            </label>
            <Textarea
              placeholder="e.g., 'I'm organizing a jazz music concert in Jaipur on Saturday evening. It's a casual gathering for music lovers, expecting around 50 people.'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="resize-none"
              rows={5}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Include as much detail as possible: event type, location, date, time, and expected attendance for best results.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Details
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
