import { NextRequest, NextResponse } from 'next/server';
import { getAzureOpenAIConfig } from '@/lib/azure-openai-config';

// Enforce Node.js runtime for server-side secrets
export const runtime = 'nodejs';

// Disable ISR to ensure secrets never cached in build output
export const revalidate = 0;

// Type for AI-generated event structure
interface GeneratedEventData {
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

// Parse date strings (handles various formats: "tomorrow", "Jan 15", "2025-01-15", etc.)
function parseEventDate(dateStr: string, baseDate: Date = new Date()): string | null {
  if (!dateStr) return null;

  const lower = dateStr.toLowerCase().trim();

  // Handle relative dates
  if (lower === 'today') {
    return baseDate.toISOString().split('T')[0];
  }
  if (lower === 'tomorrow') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Try to parse as date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Parse time strings (e.g., "2pm", "14:00", "2:30 PM")
function parseEventTime(timeStr: string): string | null {
  if (!timeStr) return null;

  const lower = timeStr.toLowerCase().trim();

  // Try regex patterns
  let match = lower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] || '0', 10);
  const meridiem = match[3];

  // Adjust for PM
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  // Validate
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Main handler
export async function POST(request: NextRequest) {
  try {
    // Verify Authorization header (client must include bearer token from session)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description } = await request.json();

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Get Azure OpenAI config
    const { endpoint, key, deploymentId } = getAzureOpenAIConfig();

    // Build the prompt for the model
    const systemPrompt = `You are an AI assistant that helps users create events by parsing natural language descriptions.

Extract event details from the user's description and return a valid JSON object with the following structure:

{
  "title": "Event title (REQUIRED - always generate from context)",
  "description": "Event description (REQUIRED - if user doesn't provide details, generate a helpful 2-3 sentence description based on the event type and title)",
  "category": "Category (REQUIRED - pick best match from: 'sports', 'music', 'social', 'education', 'food', 'art', 'technology', 'business', 'health', 'entertainment', 'other')",
  "location": "Event location/venue name",
  "date": "Event date in YYYY-MM-DD format or descriptive text like 'tomorrow' or 'next Saturday'",
  "time": "Start time in HH:MM format (24-hour) or descriptive text like '7pm'",
  "end_date": "End date if multi-day event",
  "end_time": "End time in HH:MM format (IMPORTANT: calculate based on duration if mentioned, e.g., '1 hour' means add 1 hour to start time)",
  "tags": ["tag1", "tag2"],
  "max_attendees": null or a positive number,
  "is_private": true/false,
  "require_approval": true/false (only relevant if is_private is true)
}

CRITICAL RULES:
1. ALWAYS provide title, description, and category - these are mandatory
2. If description is not provided by user, generate a helpful generic description like "Join us for an exciting [category] event featuring [title]. This event promises to be a great opportunity for [relevant activity]."
3. Calculate end_time accurately:
   - If duration mentioned (e.g., "1 hour", "2 hours", "30 minutes"), add to start time
   - Example: start "18:00" + "1 hour" = end "19:00"
   - Example: start "6pm" + "2.5 hours" = end "8:30pm" or "20:30"
4. For category, infer from keywords: dance/workout→sports, concert/performance→music, meetup/hangout→social, class/workshop→education, dinner/brunch→food, painting/craft→art, coding/hackathon→technology, networking→business, yoga/wellness→health, movie/show→entertainment
5. Return ONLY valid JSON, no markdown or extra text
6. Use 24-hour format for times when possible`;

    const userPrompt = `Extract event details from this description:\n\n${description}`;

    // Call Azure OpenAI API
    const response = await fetch(`${endpoint}/openai/deployments/${deploymentId}/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Low temperature for deterministic output
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Azure OpenAI error:', error);
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let parsedData: GeneratedEventData;
    try {
      parsedData = JSON.parse(content);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Post-process: normalize dates and times
    if (parsedData.date) {
      parsedData.date = parseEventDate(parsedData.date) || parsedData.date;
    }
    if (parsedData.time) {
      parsedData.time = parseEventTime(parsedData.time) || parsedData.time;
    }
    if (parsedData.end_date) {
      parsedData.end_date = parseEventDate(parsedData.end_date) || parsedData.end_date;
    }
    if (parsedData.end_time) {
      parsedData.end_time = parseEventTime(parsedData.end_time) || parsedData.end_time;
    }

    // Fallback: If we have start time but no end time, try to extract duration from description
    if (parsedData.time && !parsedData.end_time) {
      const durationMatch = description.match(/(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)/i);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        const startTime = parseEventTime(parsedData.time);
        
        if (startTime) {
          const [hours, minutes] = startTime.split(':').map(Number);
          let totalMinutes = hours * 60 + minutes;
          
          if (unit.startsWith('hour') || unit === 'hr') {
            totalMinutes += value * 60;
          } else {
            totalMinutes += value;
          }
          
          const endHours = Math.floor(totalMinutes / 60) % 24;
          const endMinutes = totalMinutes % 60;
          parsedData.end_time = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        }
      }
    }

    // Set end_date to same as date if not specified and event is same-day
    if (parsedData.date && !parsedData.end_date) {
      parsedData.end_date = parsedData.date;
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate event details' },
      { status: 500 }
    );
  }
}
