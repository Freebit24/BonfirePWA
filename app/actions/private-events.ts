'use server';

import { createClient } from '@supabase/supabase-js';
import { EventInviteLink } from '@/types';
import { logger } from '@/lib/logger';

// ============================================================================
// Database Type Interfaces
// Every Supabase response must be typed at the boundary
// ============================================================================

/** Database row type for events table */
interface DbEvent {
  id: string;
  organizer_id: string;
  is_private: boolean;
  require_approval?: boolean;
  title: string;
  date: string;
  time: string;
}

/** Database row type for profiles table */
interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** Database row type for event_invites table */
interface DbEventInvite {
  id: string;
  event_id: string;
  token: string;
  created_by: string;
  is_single_use: boolean;
  is_used: boolean;
  used_by?: string | null;
  used_at?: string | null;
  expires_at?: string | null;
  max_uses?: number | null;
  current_uses: number;
  created_at: string;
  updated_at: string;
}

/** Database row type for event_attendees table */
interface DbEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
}

/** Joined query result for attendee with profile */
interface DbAttendeeWithProfile extends DbEventAttendee {
  profiles: DbProfile | null;
}

/** RPC validation result structure */
interface RpcValidationResult {
  valid: boolean;
  event_id: string | null;
  error_message: string | null;
}

/** RPC consume result structure */
interface RpcConsumeResult {
  out_success: boolean;
  out_event_id: string | null;
  out_error_message: string | null;
}

/** Joined event with nested event data */
interface DbInviteWithEvent {
  id: string;
  event: DbEvent | null;
}

interface DbAttendeeWithEvent {
  id: string;
  event_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  event: DbEvent | null;
}

// ============================================================================
// Server-side Supabase client with service role for admin operations
// This bypasses RLS policies for server actions
// ============================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * Generate a new invite link for a private event
 */
export async function generateInviteLink(
  eventId: string,
  userId: string,
  options: {
    isSingleUse?: boolean;
    expiresInHours?: number;
    maxUses?: number;
  } = {}
): Promise<{ success: boolean; data?: EventInviteLink; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify user is the organizer
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('organizer_id, is_private')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    // Type assertion after null check
    const typedEvent = event as unknown as DbEvent;
    if (typedEvent.organizer_id !== userId) {
      return { success: false, error: 'Only organizers can create invite links' };
    }

    if (!typedEvent.is_private) {
      return { success: false, error: 'Cannot create invite links for public events' };
    }

    // Generate token using database function
    let token: string | null = null;
    try {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .rpc('generate_invite_token');
      if (!tokenError && tokenData) {
        token = tokenData as string;
      } else {
        logger.warn('RPC generate_invite_token unavailable, using fallback token');
      }
    } catch (e) {
      logger.warn('RPC generate_invite_token failed, using fallback token', e);
    }
    if (!token) {
      // Fallback token: random URL-safe string
      token = `${eventId}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    }

    // Calculate expiry if specified
    let expiresAt: string | null = null;
    if (options.expiresInHours) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + options.expiresInHours);
      expiresAt = expiry.toISOString();
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('event_invites')
      .insert({
        event_id: eventId,
        token,
        created_by: userId,
        is_single_use: options.isSingleUse || false,
        is_used: false,
        expires_at: expiresAt,
        max_uses: options.maxUses || null,
        current_uses: 0,
      })
      .select()
      .single();

    if (inviteError || !invite) {
      console.error('Error creating invite:', inviteError);
      return { success: false, error: 'Failed to create invite link' };
    }

    // Cast database response to known type
    const dbInvite = invite as unknown as DbEventInvite;
    
    // Type guard: validate invite matches expected structure
    const typedInvite: EventInviteLink = {
      id: dbInvite.id,
      event_id: dbInvite.event_id,
      token: dbInvite.token,
      created_by: dbInvite.created_by,
      is_single_use: dbInvite.is_single_use,
      is_used: dbInvite.is_used,
      used_by: dbInvite.used_by ?? undefined,
      used_at: dbInvite.used_at ?? undefined,
      expires_at: dbInvite.expires_at ?? undefined,
      max_uses: dbInvite.max_uses ?? undefined,
      current_uses: dbInvite.current_uses,
      created_at: dbInvite.created_at,
      updated_at: dbInvite.updated_at,
    };

    return { success: true, data: typedInvite };
  } catch (error: any) {
    console.error('Error in generateInviteLink:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Validate an invite token without consuming it
 */
export async function validateInviteToken(
  token: string
): Promise<{ 
  success: boolean; 
  data?: { 
    eventId: string; 
    eventTitle: string; 
    organizerName: string;
    eventDate: string;
    eventTime: string;
    isPrivate: boolean;
  }; 
  error?: string;
}> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Call database function to validate
    const { data: validationResult, error: validationError } = await supabaseAdmin
      .rpc('validate_invite_token', { invite_token: token });

    if (validationError || !validationResult) {
      console.error('Validation RPC error:', validationError);
      return { success: false, error: 'Invalid invite link' };
    }

    logger.log('Validation result:', validationResult);

    const typedValidation = validationResult as unknown as RpcValidationResult[];
    if (!Array.isArray(typedValidation) || typedValidation.length === 0) {
      console.error('No validation result returned');
      return { success: false, error: 'Invalid invite link' };
    }

    const validation = typedValidation[0];
    logger.log('Validation object:', validation);
    
    if (!validation.valid || !validation.event_id) {
      console.error('Token validation failed:', validation.error_message);
      return { success: false, error: validation.error_message || 'Invalid invite link' };
    }

    // Fetch event details for preview
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, date, time, is_private, organizer_id')
      .eq('id', validation.event_id)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError);
      return { success: false, error: 'Event not found' };
    }

    // Type assertions after null checks
    const typedEvent = event as unknown as DbEvent;

    // Fetch organizer details separately
    const { data: organizer } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', typedEvent.organizer_id)
      .single();
    
    const typedOrganizer = organizer as unknown as DbProfile | null;

    return {
      success: true,
      data: {
        eventId: typedEvent.id,
        eventTitle: typedEvent.title,
        organizerName: typedOrganizer?.full_name ?? typedOrganizer?.email ?? 'Unknown',
        eventDate: typedEvent.date,
        eventTime: typedEvent.time,
        isPrivate: typedEvent.is_private,
      },
    };
  } catch (error: any) {
    console.error('Error in validateInviteToken:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Consume an invite token and join the user to the event
 */
export async function consumeInviteToken(
  token: string,
  userId: string
): Promise<{ success: boolean; data?: { eventId: string }; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Get the event_id from the invite token first to properly check attendance
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('event_invites')
      .select('event_id')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      console.error('Invite fetch error:', inviteError);
      return { success: false, error: 'Invalid invite link' };
    }

    const typedInvite = invite as unknown as DbEventInvite;

    // Check if user already joined THIS specific event
    const { data: existingAttendee, error: attendeeError } = await supabaseAdmin
      .from('event_attendees')
      .select('id, status, event_id')
      .eq('user_id', userId)
      .eq('event_id', typedInvite.event_id);

    if (!attendeeError && existingAttendee && existingAttendee.length > 0) {
      const attendee = existingAttendee[0] as unknown as DbEventAttendee;
      if (attendee && attendee.status === 'approved') {
        logger.log('User already attending event:', attendee.event_id);
        return { 
          success: true, 
          data: { eventId: attendee.event_id },
        };
      }
    }

    // Call database function to consume token and create attendee
    logger.log('Calling consume_invite_token with:', { p_invite_token: token, p_user_id: userId });
    
    const { data: consumeResult, error: consumeError } = await supabaseAdmin
      .rpc('consume_invite_token', { 
        p_invite_token: token,
        p_user_id: userId 
      });

    if (consumeError || !consumeResult) {
      console.error('Consume RPC error:', {
        message: consumeError?.message,
        code: consumeError?.code,
        details: consumeError?.details,
        hint: consumeError?.hint,
      });
      return { success: false, error: consumeError?.message || 'Failed to join event' };
    }

    logger.log('Consume RPC result:', consumeResult);

    const typedConsumeResult = consumeResult as unknown as RpcConsumeResult[];
    if (!Array.isArray(typedConsumeResult) || typedConsumeResult.length === 0) {
      console.error('No result from consume function');
      return { success: false, error: 'Failed to process invite' };
    }

    const consumption = typedConsumeResult[0];
    logger.log('Consume result:', { success: consumption.out_success, eventId: consumption.out_event_id });
    
    if (!consumption.out_success || !consumption.out_event_id) {
      console.error('Consumption failed:', consumption.out_error_message);
      return { success: false, error: consumption.out_error_message || 'Failed to join event' };
    }

    logger.log('Successfully consumed invite for event:', consumption.out_event_id);
    return { 
      success: true, 
      data: { eventId: consumption.out_event_id },
    };
  } catch (error: any) {
    console.error('Error in consumeInviteToken:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Submit a join request for a private event
 */
export async function submitJoinRequest(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify event is private and requires approval
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('is_private, require_approval, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    const typedEvent = event as unknown as DbEvent;
    if (!typedEvent.is_private) {
      return { success: false, error: 'This is a public event' };
    }

    // Check if already an attendee (use maybeSingle to avoid error if not found)
    const { data: existingAttendee, error: attendeeError } = await supabaseAdmin
      .from('event_attendees')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (attendeeError) {
      console.error('Error checking existing attendee:', attendeeError);
      return { success: false, error: 'Failed to check attendance status' };
    }

    if (existingAttendee) {
      const typedAttendee = existingAttendee as DbEventAttendee;
      if (typedAttendee.status === 'approved') {
        return { success: false, error: 'You are already attending this event' };
      }
      if (typedAttendee.status === 'pending') {
        return { success: false, error: 'You have already requested to join this event' };
      }
    }

    // Create join request with pending status
    const { error: insertError } = await supabaseAdmin
      .from('event_attendees')
      .insert({
        event_id: eventId,
        user_id: userId,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error creating join request:', insertError);
      return { success: false, error: 'Failed to submit join request' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in submitJoinRequest:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Approve or reject a join request
 */
export async function updateJoinRequest(
  attendeeId: string,
  status: 'approved' | 'rejected',
  organizerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Get the attendee record and verify organizer
    const { data: attendee, error: fetchError } = await supabaseAdmin
      .from('event_attendees')
      .select(`
        id,
        event_id,
        user_id,
        status,
        event:events!event_attendees_event_id_fkey(organizer_id)
      `)
      .eq('id', attendeeId)
      .single();

    if (fetchError || !attendee) {
      return { success: false, error: 'Join request not found' };
    }

    const typedAttendee = attendee as unknown as DbAttendeeWithEvent;
    if (!typedAttendee.event) {
      return { success: false, error: 'Event data not found' };
    }

    if (typedAttendee.event.organizer_id !== organizerId) {
      return { success: false, error: 'Only the organizer can approve join requests' };
    }

    if (typedAttendee.status !== 'pending') {
      return { success: false, error: 'This request has already been processed' };
    }

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('event_attendees')
      .update({ status })
      .eq('id', attendeeId);

    if (updateError) {
      console.error('Error updating join request:', updateError);
      return { success: false, error: 'Failed to update join request' };
    }

    // DO NOT manually increment attendees_count here!
    // The database trigger (manage_attendee_changes) will handle it automatically
    // when status changes to 'approved'. This prevents double-increment.

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateJoinRequest:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Get pending join requests for an event
 */
export async function getPendingJoinRequests(
  eventId: string,
  organizerId: string
): Promise<{ 
  success: boolean; 
  data?: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    createdAt: string;
  }>; 
  error?: string;
}> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify organizer
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    const typedEvent = event as unknown as DbEvent;
    if (typedEvent.organizer_id !== organizerId) {
      return { success: false, error: 'Only the organizer can view join requests' };
    }

    // Get pending requests
    // Note: Using joined_at for timestamp (created_at doesn't exist in event_attendees schema)
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('event_attendees')
      .select(`
        id,
        user_id,
        joined_at,
        profiles!event_attendees_user_id_fkey(
          full_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });

    if (requestsError || !requests) {
      console.error('Error fetching join requests:', requestsError);
      return { success: false, error: 'Failed to fetch join requests' };
    }

    const typedRequests = requests as unknown as DbAttendeeWithProfile[];
    const formattedRequests = typedRequests.map((req) => ({
      id: req.id,
      userId: req.user_id,
      userName: req.profiles?.full_name ?? req.profiles?.email ?? 'Unknown User',
      userEmail: req.profiles?.email ?? '',
      createdAt: req.joined_at, // Using joined_at as the request timestamp
    }));

    return { success: true, data: formattedRequests };
  } catch (error: any) {
    console.error('Error in getPendingJoinRequests:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Get all invite links for an event
 */
export async function getEventInviteLinks(
  eventId: string,
  organizerId: string
): Promise<{ success: boolean; data?: EventInviteLink[]; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify organizer
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    const typedEvent = event as unknown as DbEvent;
    if (typedEvent.organizer_id !== organizerId) {
      return { success: false, error: 'Only the organizer can view invite links' };
    }

    // Get all invites
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('event_invites')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (invitesError || !invites) {
      console.error('Error fetching invites:', invitesError);
      return { success: false, error: 'Failed to fetch invite links' };
    }

    const dbInvites = invites as unknown as DbEventInvite[];
    // Map DbEventInvite to EventInviteLink with proper null handling
    const typedInvites: EventInviteLink[] = dbInvites.map(inv => ({
      id: inv.id,
      event_id: inv.event_id,
      token: inv.token,
      created_by: inv.created_by,
      is_single_use: inv.is_single_use,
      is_used: inv.is_used,
      used_by: inv.used_by ?? undefined,
      used_at: inv.used_at ?? undefined,
      expires_at: inv.expires_at ?? undefined,
      max_uses: inv.max_uses ?? undefined,
      current_uses: inv.current_uses,
      created_at: inv.created_at,
      updated_at: inv.updated_at,
    }));

    return { success: true, data: typedInvites };
  } catch (error: any) {
    console.error('Error in getEventInviteLinks:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Delete an invite link
 */
export async function deleteInviteLink(
  inviteId: string,
  organizerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify organizer
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('event_invites')
      .select(`
        id,
        event:events!event_invites_event_id_fkey(organizer_id)
      `)
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return { success: false, error: 'Invite link not found' };
    }

    const typedInvite = invite as unknown as DbInviteWithEvent;
    if (!typedInvite.event) {
      return { success: false, error: 'Event data not found' };
    }

    if (typedInvite.event.organizer_id !== organizerId) {
      return { success: false, error: 'Only the organizer can delete invite links' };
    }

    // Delete invite
    const { error: deleteError } = await supabaseAdmin
      .from('event_invites')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      console.error('Error deleting invite:', deleteError);
      return { success: false, error: 'Failed to delete invite link' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteInviteLink:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Organizer joins their own event (bypasses approval requirement)
 * Uses supabaseAdmin to bypass RLS policies
 */
export async function organizerJoinEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server is not configured with Supabase service role key.' };
    }
    // Verify user is the organizer
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, organizer_id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'Event not found' };
    }

    const typedEvent = event as unknown as DbEvent;
    if (typedEvent.organizer_id !== userId) {
      return { success: false, error: 'Only the event organizer can join' };
    }

    // Check if organizer already joined
    const { data: existingAttendee } = await supabaseAdmin
      .from('event_attendees')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAttendee) {
      const typedAttendee = existingAttendee as DbEventAttendee;
      if (typedAttendee.status === 'approved') {
        return { success: false, error: 'You are already attending this event' };
      }
      // If pending/rejected, delete and re-insert as approved
      await supabaseAdmin
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);
    }

    // Insert organizer as approved attendee
    const { error: insertError } = await supabaseAdmin
      .from('event_attendees')
      .insert({
        event_id: eventId,
        user_id: userId,
        status: 'approved',
      });

    if (insertError) {
      // Check if error is due to unique constraint violation (23505 = duplicate key)
      if (insertError.code === '23505') {
        // User already has a record - this is fine (idempotent operation)
        logger.log('Organizer already has attendee record (idempotent success)');
        return { success: true };
      }
      console.error('Error adding organizer as attendee:', insertError);
      return { success: false, error: 'Failed to join event' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in organizerJoinEvent:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}
