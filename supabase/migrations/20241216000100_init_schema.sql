-- Baseline schema migration
-- Created: 2024-12-16

-- ============================================================================
-- CREATE TYPES
-- ============================================================================

CREATE TYPE "public"."event_visibility" AS ENUM (
    'public',
    'private'
);


-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."can_join_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE
      -- Public active events
      WHEN EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = p_event_id
          AND (e.visibility = 'public' OR e.is_private = FALSE OR e.is_private IS NULL)
          AND (e.status IS NULL OR e.status = 'active')
      )
      THEN true
      -- Organizer can always join their own event
      WHEN EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = p_event_id
          AND e.organizer_id = p_user_id
      )
      THEN true
      -- Private events - if user has used an invite link
      WHEN EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = p_event_id
          AND (e.visibility = 'private' OR e.is_private = TRUE)
          AND (e.status IS NULL OR e.status = 'active')
      )
      AND EXISTS (
        SELECT 1 FROM event_invites ei
        WHERE ei.event_id = p_event_id
          AND ei.used_by = p_user_id
      )
      THEN true
      ELSE false
    END;
$$;


CREATE OR REPLACE FUNCTION "public"."can_user_be_invited_or_is_invited"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_invites ei
    WHERE ei.event_id = p_event_id
      AND ei.user_id = p_user_id  -- MUST match the specific user
      AND (ei.status IS NULL OR ei.status IN ('pending', 'accepted'))
  );
$$;


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS TABLE("deleted_count" integer, "execution_time_ms" integer, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  batch_size INT := 1000;
  total_deleted INT := 0;
  batch_deleted INT;
  start_time TIMESTAMP := clock_timestamp();
  lock_obtained BOOLEAN;
BEGIN
  lock_obtained := pg_try_advisory_lock(123456);
  IF NOT lock_obtained THEN
    RETURN QUERY SELECT 0, 0, 'SKIPPED: Another cleanup is already running';
    RETURN;
  END IF;

  BEGIN
    LOOP
      DELETE FROM notifications
      WHERE id IN (
        SELECT id FROM notifications
        WHERE read = true
          AND created_at < NOW() - INTERVAL '90 days'
        LIMIT batch_size
      );
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      total_deleted := total_deleted + batch_deleted;
      EXIT WHEN batch_deleted = 0;
      PERFORM pg_sleep(0.1);
    END LOOP;

    LOOP
      DELETE FROM notifications
      WHERE id IN (
        SELECT id FROM notifications
        WHERE read = false
          AND created_at < NOW() - INTERVAL '180 days'
        LIMIT batch_size
      );
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      total_deleted := total_deleted + batch_deleted;
      EXIT WHEN batch_deleted = 0;
      PERFORM pg_sleep(0.1);
    END LOOP;

    RETURN QUERY SELECT
      total_deleted,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INT,
      'SUCCESS: Deleted ' || total_deleted || ' old notifications';
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(123456);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(123456);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."consume_invite_token"("p_invite_token" "text", "p_user_id" "uuid") RETURNS TABLE("out_success" boolean, "out_event_id" "uuid", "out_error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invite event_invites%ROWTYPE;
BEGIN
  -- Lock the invite row to prevent double-consumption
  SELECT * INTO v_invite
  FROM event_invites
  WHERE token = p_invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::uuid, 'Invalid invite link'::text;
    RETURN;
  END IF;

  -- Expiry check
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::uuid, 'Invite link has expired'::text;
    RETURN;
  END IF;

  -- Max uses check for multi-use invites
  IF v_invite.max_uses IS NOT NULL AND COALESCE(v_invite.current_uses, 0) >= v_invite.max_uses THEN
    RETURN QUERY SELECT FALSE, NULL::uuid, 'Invite link has reached maximum uses'::text;
    RETURN;
  END IF;

  -- Single-use guard (allow idempotent re-use by the same user)
  IF v_invite.is_single_use AND v_invite.is_used AND v_invite.used_by IS NOT NULL AND v_invite.used_by <> p_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::uuid, 'Invite link has already been used'::text;
    RETURN;
  END IF;

  -- Upsert attendee as approved (trigger will handle attendees_count)
  INSERT INTO event_attendees (event_id, user_id, status, invite_id)
  VALUES (v_invite.event_id, p_user_id, 'approved', v_invite.id)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    status = 'approved',
    invite_id = v_invite.id;

  -- Mark invite usage (idempotent for same user)
  UPDATE event_invites
  SET
    is_used = CASE WHEN v_invite.is_single_use THEN TRUE ELSE is_used END,
    used_by = CASE WHEN v_invite.is_single_use THEN p_user_id ELSE used_by END,
    used_at = CASE WHEN v_invite.is_single_use THEN NOW() ELSE used_at END,
    current_uses = CASE
      WHEN v_invite.max_uses IS NULL THEN COALESCE(current_uses, 0) + 1
      ELSE LEAST(COALESCE(current_uses, 0) + 1, v_invite.max_uses)
    END
  WHERE id = v_invite.id;

  RETURN QUERY SELECT TRUE, v_invite.event_id, NULL::text;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."generate_invite_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_token TEXT;
  token_count INT;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(32), 'hex');
    SELECT COUNT(*) INTO token_count FROM event_invites WHERE event_invites.token = new_token;
    EXIT WHEN token_count = 0;
  END LOOP;
  RETURN new_token;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;$$;


CREATE OR REPLACE FUNCTION "public"."is_attendee"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM event_attendees ea
    WHERE ea.event_id = p_event_id
      AND ea.user_id = p_user_id
  );
$$;


CREATE OR REPLACE FUNCTION "public"."is_event_organizer"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
      AND e.organizer_id = p_user_id
  );
$$;


CREATE OR REPLACE FUNCTION "public"."is_invited"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM event_invites ei
    WHERE ei.event_id = p_event_id
      AND ei.used_by = p_user_id
  );
$$;


CREATE OR REPLACE FUNCTION "public"."is_organizer"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = p_event_id
      AND e.organizer_id = p_user_id
  );
$$;


CREATE OR REPLACE FUNCTION "public"."is_user_attending_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = p_event_id
      AND ea.user_id = p_user_id
      AND ea.status = 'approved'  -- Only approved attendees
  );
$$;


CREATE OR REPLACE FUNCTION "public"."manage_attendee_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  event_record RECORD;
  user_name TEXT;
  old_status TEXT;
  new_status TEXT;
  current_count INTEGER;
BEGIN
  old_status := COALESCE(OLD.status, 'none');
  new_status := COALESCE(NEW.status, 'none');

  RAISE NOTICE '[TRIGGER] TG_OP=%, event=%, user=%, old_status=%, new_status=%',
    TG_OP, 
    COALESCE(NEW.event_id, OLD.event_id),
    COALESCE(NEW.user_id, OLD.user_id),
    old_status,
    new_status;

  -- Get event details with row-level lock to prevent race conditions
  SELECT id, title, organizer_id, attendees_count INTO event_record
  FROM events
  WHERE id = COALESCE(NEW.event_id, OLD.event_id)
  FOR UPDATE;  -- CRITICAL: Lock the row to prevent concurrent updates

  SELECT COALESCE(full_name, email) INTO user_name
  FROM profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- ==========================================
  -- PART 1: Update attendees_count (COMPREHENSIVE)
  -- ONLY 'approved' status counts toward attendees_count
  -- All other statuses (pending, rejected, etc.) do NOT count
  -- ==========================================

  IF TG_OP = 'INSERT' THEN
    -- INSERT: Only increment if inserting with 'approved' status
    IF NEW.status = 'approved' THEN
      RAISE NOTICE '[TRIGGER] INSERT status=approved: INCREMENTING count from % to %', 
        event_record.attendees_count, event_record.attendees_count + 1;
      
      UPDATE events
      SET attendees_count = attendees_count + 1
      WHERE id = NEW.event_id;
    ELSE
      RAISE NOTICE '[TRIGGER] INSERT status=%: NO count change (only approved counts)', NEW.status;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- UPDATE: Handle all possible status transitions explicitly
    
    -- Transition TO approved (from any other status)
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      RAISE NOTICE '[TRIGGER] UPDATE % → approved: INCREMENTING count from % to %', 
        OLD.status, event_record.attendees_count, event_record.attendees_count + 1;
      
      UPDATE events
      SET attendees_count = attendees_count + 1
      WHERE id = NEW.event_id;
    
    -- Transition FROM approved (to any other status: pending, rejected, etc.)
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      RAISE NOTICE '[TRIGGER] UPDATE approved → %: DECREMENTING count from % to %', 
        NEW.status, event_record.attendees_count, GREATEST(event_record.attendees_count - 1, 0);
      
      UPDATE events
      SET attendees_count = GREATEST(attendees_count - 1, 0)
      WHERE id = NEW.event_id;
    
    -- Transition between non-approved statuses (e.g., pending → rejected)
    ELSE
      RAISE NOTICE '[TRIGGER] UPDATE % → %: NO count change (neither is approved)', 
        OLD.status, NEW.status;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- DELETE: Only decrement if deleting an 'approved' record
    IF OLD.status = 'approved' THEN
      RAISE NOTICE '[TRIGGER] DELETE status=approved: DECREMENTING count from % to %', 
        event_record.attendees_count, GREATEST(event_record.attendees_count - 1, 0);
      
      UPDATE events
      SET attendees_count = GREATEST(attendees_count - 1, 0)
      WHERE id = OLD.event_id;
    ELSE
      RAISE NOTICE '[TRIGGER] DELETE status=%: NO count change (only approved counts)', OLD.status;
    END IF;
  END IF;

  -- ==========================================
  -- PART 2: Send notifications
  -- ==========================================

  BEGIN
    -- Notify organizer when someone requests to join (pending status)
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      IF event_record.organizer_id IS NOT NULL AND event_record.organizer_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, related_event_id)
        VALUES (
          event_record.organizer_id,
          'join_request',
          'Join Request for ' || event_record.title,
          COALESCE(user_name, 'Someone') || ' has requested to join your event',
          event_record.id
        );
      END IF;
    END IF;

    -- Notify user when their request is approved (pending → approved)
    IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
      IF NEW.user_id != event_record.organizer_id THEN
        INSERT INTO notifications (user_id, type, title, message, related_event_id)
        VALUES (
          NEW.user_id,
          'join_approved',
          'Request Approved for ' || event_record.title,
          'Your request to join ' || event_record.title || ' has been approved',
          event_record.id
        );
      END IF;
    END IF;

    -- Notify user when their request is rejected (pending → rejected)
    IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      IF NEW.user_id != event_record.organizer_id THEN
        INSERT INTO notifications (user_id, type, title, message, related_event_id)
        VALUES (
          NEW.user_id,
          'join_rejected',
          'Request Declined for ' || event_record.title,
          'Your request to join ' || event_record.title || ' was declined by the organizer',
          event_record.id
        );
      END IF;
    END IF;

    -- Notify organizer when someone joins directly (approved insert, not organizer)
    IF TG_OP = 'INSERT' AND NEW.status = 'approved' AND NEW.user_id != event_record.organizer_id THEN
      INSERT INTO notifications (user_id, type, title, message, related_event_id)
      VALUES (
        event_record.organizer_id,
        'organizer_alert',
        'New RSVP for ' || event_record.title,
        COALESCE(user_name, 'Someone') || ' has joined your event',
        event_record.id
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[TRIGGER] Failed to create notification: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."notify_event_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  attendee_record RECORD;
  change_details TEXT := '';
  has_important_changes BOOLEAN := FALSE;
BEGIN
  -- Wrap in exception handler so event update succeeds even if notification fails
  BEGIN
    -- Check if important fields changed
    IF OLD.date IS DISTINCT FROM NEW.date OR 
       OLD.time IS DISTINCT FROM NEW.time OR
       OLD.location IS DISTINCT FROM NEW.location OR
       OLD.status IS DISTINCT FROM NEW.status THEN
      has_important_changes := TRUE;
    END IF;

    -- Only notify if event is active and has important changes
    IF NEW.status = 'active' AND has_important_changes THEN
      -- Build change message
      IF OLD.date IS DISTINCT FROM NEW.date OR OLD.time IS DISTINCT FROM NEW.time THEN
        change_details := 'Time changed to ' || NEW.date || ' at ' || NEW.time;
      ELSIF OLD.location IS DISTINCT FROM NEW.location THEN
        change_details := 'Location changed to ' || NEW.location;
      ELSIF NEW.status = 'cancelled' THEN
        change_details := 'Event has been cancelled';
      ELSE
        change_details := 'Event details have been updated';
      END IF;

      -- Notify all attendees
      FOR attendee_record IN
        SELECT DISTINCT user_id
        FROM event_attendees
        WHERE event_id = NEW.id
      LOOP
        INSERT INTO notifications (user_id, type, title, message, related_event_id)
        VALUES (
          attendee_record.user_id,
          'event_update',
          'Event Update: ' || NEW.title,
          change_details,
          NEW.id
        );
      END LOOP;

      -- Log for debugging
      RAISE NOTICE 'Event update notification sent for event: %, changes: %', NEW.id, change_details;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the event update
      RAISE WARNING 'Failed to create event update notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."send_event_reminders"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  event_record RECORD;
  attendee_record RECORD;
  event_time TIMESTAMP;
  hours_until INT;
BEGIN
  -- Loop through active events happening in the next ~25 hours only
  FOR event_record IN
    SELECT id, title, date, time, organizer_id
    FROM events
    WHERE status = 'active'
      AND (date || ' ' || time)::TIMESTAMP > NOW()
      AND (date || ' ' || time)::TIMESTAMP < NOW() + INTERVAL '25 hours'
  LOOP
    -- Calculate time until event
    event_time := (event_record.date || ' ' || event_record.time)::TIMESTAMP;
    hours_until := EXTRACT(EPOCH FROM (event_time - NOW())) / 3600;

    -- Send 24h reminder
    IF hours_until > 23 AND hours_until <= 25 THEN
      FOR attendee_record IN
        SELECT user_id FROM event_attendees WHERE event_id = event_record.id
      LOOP
        -- Check if reminder not already sent
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = attendee_record.user_id
            AND related_event_id = event_record.id
            AND type = 'event_reminder'
            AND title LIKE 'Event Tomorrow:%'
            AND created_at > NOW() - INTERVAL '1 day'
        ) THEN
          INSERT INTO notifications (user_id, type, title, message, related_event_id)
          VALUES (
            attendee_record.user_id,
            'event_reminder',
            'Event Tomorrow: ' || event_record.title,
            'Your event starts in 24 hours',
            event_record.id
          );
        END IF;
      END LOOP;
    END IF;

    -- Send 1h reminder
    IF hours_until > 0.5 AND hours_until <= 1.5 THEN
      FOR attendee_record IN
        SELECT user_id FROM event_attendees WHERE event_id = event_record.id
      LOOP
        -- Check if reminder not already sent
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = attendee_record.user_id
            AND related_event_id = event_record.id
            AND type = 'event_reminder'
            AND title LIKE 'Starting Soon:%'
            AND created_at > NOW() - INTERVAL '2 hours'
        ) THEN
          INSERT INTO notifications (user_id, type, title, message, related_event_id)
          VALUES (
            attendee_record.user_id,
            'event_reminder',
            'Starting Soon: ' || event_record.title,
            'Your event starts in 1 hour',
            event_record.id
          );
        END IF;
      END LOOP;
    END IF;

    -- Send "today" reminder
    IF hours_until > 0 AND hours_until <= 6 THEN
      FOR attendee_record IN
        SELECT user_id FROM event_attendees WHERE event_id = event_record.id
      LOOP
        -- Check if reminder not already sent
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = attendee_record.user_id
            AND related_event_id = event_record.id
            AND type = 'upcoming_event'
            AND title LIKE 'Event Today:%'
            AND created_at > NOW() - INTERVAL '12 hours'
        ) THEN
          INSERT INTO notifications (user_id, type, title, message, related_event_id)
          VALUES (
            attendee_record.user_id,
            'upcoming_event',
            'Event Today: ' || event_record.title,
            'Your event is happening today at ' || event_record.time,
            event_record.id
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."send_event_reminders_safe"() RETURNS TABLE("reminders_sent" integer, "execution_time_ms" integer, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  reminder_count INT := 0;
  start_time TIMESTAMP := clock_timestamp();
  lock_obtained BOOLEAN;
BEGIN
  lock_obtained := pg_try_advisory_lock(123457);
  IF NOT lock_obtained THEN
    RETURN QUERY SELECT 0, 0, 'SKIPPED: Another reminder job is already running';
    RETURN;
  END IF;

  BEGIN
    PERFORM send_event_reminders();
    SELECT COUNT(*) INTO reminder_count
    FROM notifications
    WHERE type IN ('event_reminder', 'upcoming_event')
      AND created_at > NOW() - INTERVAL '1 minute';

    RETURN QUERY SELECT
      reminder_count,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INT,
      'SUCCESS: Sent ' || reminder_count || ' reminders';
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(123457);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(123457);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."vacuum_notifications"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  EXECUTE 'VACUUM ANALYZE notifications';
  RETURN 'Vacuum completed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'Vacuum failed: ' || SQLERRM;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."validate_invite_token"("invite_token" "text") RETURNS TABLE("valid" boolean, "invite_id" "uuid", "event_id" "uuid", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- Query the event_invites table using alias to avoid ambiguity
  SELECT ei.id, ei.event_id, ei.expires_at, ei.is_single_use, ei.is_used, ei.max_uses, ei.current_uses 
  INTO v_invite
  FROM event_invites ei
  WHERE ei.token = invite_token;
  
  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Invalid invite token'::TEXT;
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, v_invite.id, v_invite.event_id, 'Invite link has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if single-use and already used
  IF v_invite.is_single_use AND v_invite.is_used THEN
    RETURN QUERY SELECT FALSE, v_invite.id, v_invite.event_id, 'Invite link has already been used'::TEXT;
    RETURN;
  END IF;
  
  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.current_uses >= v_invite.max_uses THEN
    RETURN QUERY SELECT FALSE, v_invite.id, v_invite.event_id, 'Invite link has reached maximum uses'::TEXT;
    RETURN;
  END IF;
  
  -- Valid invite
  RETURN QUERY SELECT TRUE, v_invite.id, v_invite.event_id, NULL::TEXT;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."validate_username"("username" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  RETURN username ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$';
END;
$_$;


-- ============================================================================
-- CREATE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."event_attendees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'approved'::"text",
    "invite_id" "uuid",
    CONSTRAINT "event_attendees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."event_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_single_use" boolean DEFAULT false,
    "is_used" boolean DEFAULT false,
    "used_by" "uuid",
    "used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "email" "text",
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "event_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "latitude" double precision,
    "longitude" double precision,
    "date" "text" NOT NULL,
    "time" "text" NOT NULL,
    "duration" integer DEFAULT 120,
    "category" "text",
    "max_attendees" integer,
    "attendees_count" integer DEFAULT 0,
    "tags" "text"[],
    "status" "text" DEFAULT 'active'::"text",
    "organizer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "end_date" "date",
    "end_time" time without time zone,
    "time_zone" "text" DEFAULT 'Asia/Kolkata'::"text" NOT NULL,
    "visibility" "public"."event_visibility" DEFAULT 'public'::"public"."event_visibility" NOT NULL,
    "is_private" boolean DEFAULT false,
    "require_approval" boolean DEFAULT false
);


CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications_enabled" boolean DEFAULT true,
    "push_notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "related_event_id" "uuid",
    "read" boolean DEFAULT false,
    "email_sent" boolean DEFAULT false,
    "push_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['rsvp_confirmation'::"text", 'event_reminder'::"text", 'event_update'::"text", 'organizer_alert'::"text", 'event_published'::"text", 'upcoming_event'::"text", 'attendee_checkin'::"text", 'join_request'::"text", 'join_approved'::"text", 'join_rejected'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "full_name" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "email" "text",
    "phone" "text",
    "bio" "text"
);


-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX "events_visibility_idx" ON "public"."events" USING "btree" ("visibility");
CREATE INDEX "idx_event_attendees_event_status" ON "public"."event_attendees" USING "btree" ("event_id", "status") WHERE ("status" = 'pending'::"text");
CREATE INDEX "idx_event_attendees_event_user" ON "public"."event_attendees" USING "btree" ("event_id", "user_id");
CREATE INDEX "idx_event_attendees_status" ON "public"."event_attendees" USING "btree" ("event_id", "status");
CREATE INDEX "idx_event_attendees_user_status" ON "public"."event_attendees" USING "btree" ("user_id", "status");
CREATE INDEX "idx_event_invites_created_by" ON "public"."event_invites" USING "btree" ("created_by");
CREATE INDEX "idx_event_invites_email" ON "public"."event_invites" USING "btree" ("email");
CREATE INDEX "idx_event_invites_event_id" ON "public"."event_invites" USING "btree" ("event_id");
CREATE INDEX "idx_event_invites_token" ON "public"."event_invites" USING "btree" ("token");
CREATE INDEX "idx_event_invites_user_id" ON "public"."event_invites" USING "btree" ("user_id");
CREATE INDEX "idx_events_is_private" ON "public"."events" USING "btree" ("is_private");
CREATE INDEX "idx_events_organizer" ON "public"."events" USING "btree" ("organizer_id");
CREATE INDEX "idx_events_organizer_id" ON "public"."events" USING "btree" ("organizer_id");
CREATE INDEX "idx_events_public_active" ON "public"."events" USING "btree" ("id") WHERE (("visibility" = 'public'::"public"."event_visibility") AND (("status" IS NULL) OR ("status" = 'active'::"text")));
CREATE INDEX "idx_events_visibility_status" ON "public"."events" USING "btree" ("visibility", "status");
CREATE INDEX "idx_notification_settings_user_id" ON "public"."notification_settings" USING "btree" ("user_id");
CREATE INDEX "idx_notifications_cleanup" ON "public"."notifications" USING "btree" ("read", "created_at") WHERE ("read" = true);
CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");
CREATE INDEX "idx_notifications_related_event" ON "public"."notifications" USING "btree" ("related_event_id");
CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");
CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);
CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");


-- ============================================================================
-- ADD PRIMARY KEYS
-- ============================================================================

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


-- ============================================================================
-- ADD UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_user_id_key" UNIQUE ("event_id", "user_id");
-- ALTER TABLE ONLY "public"."event_attendees"
--     ADD CONSTRAINT "event_attendees_event_user_unique" UNIQUE ("event_id", "user_id");
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_token_key" UNIQUE ("token");
ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_user_id_key" UNIQUE ("user_id");


-- ============================================================================
-- ADD FOREIGN KEYS
-- ============================================================================

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."event_invites"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_event_id_fkey" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER "event_update_notification" AFTER UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_event_update"();
CREATE OR REPLACE TRIGGER "manage_event_attendees" AFTER INSERT OR DELETE OR UPDATE ON "public"."event_attendees" FOR EACH ROW EXECUTE FUNCTION "public"."manage_attendee_changes"();
CREATE OR REPLACE TRIGGER "update_notification_settings_updated_at" BEFORE UPDATE ON "public"."notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE "public"."event_attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."event_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Profiles
CREATE POLICY "Users can access their own profile" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));
CREATE POLICY "profiles_select_basic_info" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "profiles_select_email_for_invites" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "users_can_update_their_own_profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

-- Event Attendees
CREATE POLICY "event_attendees_delete_self_or_organizer" ON "public"."event_attendees" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"()))))));
CREATE POLICY "event_attendees_insert_controlled" ON "public"."event_attendees" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND (("e"."visibility" = 'public'::"public"."event_visibility") OR ("e"."is_private" = false) OR ("e"."is_private" IS NULL)) AND (("e"."status" IS NULL) OR ("e"."status" = 'active'::"text"))))) AND ("status" = 'approved'::"text")) OR ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND (("e"."visibility" = 'private'::"public"."event_visibility") OR ("e"."is_private" = true)) AND (("e"."require_approval" = false) OR ("e"."require_approval" IS NULL)) AND (("e"."status" IS NULL) OR ("e"."status" = 'active'::"text"))))) AND ("status" = 'approved'::"text")) OR ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND (("e"."visibility" = 'private'::"public"."event_visibility") OR ("e"."is_private" = true)) AND ("e"."require_approval" = true)))) AND ("status" = 'pending'::"text") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))))));
CREATE POLICY "event_attendees_select_organizer" ON "public"."event_attendees" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));
CREATE POLICY "event_attendees_select_self" ON "public"."event_attendees" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "event_attendees_update_organizer" ON "public"."event_attendees" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendees"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));

-- Event Invites
CREATE POLICY "event_invites_delete_organizer" ON "public"."event_invites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));
CREATE POLICY "event_invites_insert_organizer" ON "public"."event_invites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));
CREATE POLICY "event_invites_select_by_token" ON "public"."event_invites" FOR SELECT TO "authenticated" USING ((("token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND ((NOT "is_single_use") OR (NOT "is_used")) AND (("max_uses" IS NULL) OR ("current_uses" < "max_uses"))));
CREATE POLICY "event_invites_select_organizer" ON "public"."event_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));
CREATE POLICY "event_invites_select_self" ON "public"."event_invites" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "event_invites_update_organizer" ON "public"."event_invites" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_invites"."event_id") AND ("e"."organizer_id" = "auth"."uid"())))));

-- Events
CREATE POLICY "events_delete_organizer" ON "public"."events" FOR DELETE TO "authenticated" USING (("organizer_id" = "auth"."uid"()));
CREATE POLICY "events_insert_authenticated" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("organizer_id" = "auth"."uid"()));
CREATE POLICY "events_select_organizer" ON "public"."events" FOR SELECT TO "authenticated" USING (("organizer_id" = "auth"."uid"()));
CREATE POLICY "events_select_private_exclusive" ON "public"."events" FOR SELECT TO "authenticated" USING (((("visibility" = 'private'::"public"."event_visibility") OR ("is_private" = true)) AND (("require_approval" = false) OR ("require_approval" IS NULL)) AND (("status" IS NULL) OR ("status" = 'active'::"text")) AND ("public"."is_event_organizer"("id", "auth"."uid"()) OR "public"."can_user_be_invited_or_is_invited"("id", "auth"."uid"()) OR "public"."is_user_attending_event"("id", "auth"."uid"()))));
CREATE POLICY "events_select_private_requestable" ON "public"."events" FOR SELECT TO "authenticated" USING (((("visibility" = 'private'::"public"."event_visibility") OR ("is_private" = true)) AND ("require_approval" = true) AND (("status" IS NULL) OR ("status" = 'active'::"text"))));
CREATE POLICY "events_select_public" ON "public"."events" FOR SELECT TO "authenticated" USING (((("visibility" = 'public'::"public"."event_visibility") OR ("is_private" = false) OR ("is_private" IS NULL)) AND (("status" IS NULL) OR ("status" = 'active'::"text"))));
CREATE POLICY "events_update_organizer" ON "public"."events" FOR UPDATE TO "authenticated" USING (("organizer_id" = "auth"."uid"())) WITH CHECK (("organizer_id" = "auth"."uid"()));

-- Notification Settings
CREATE POLICY "notification_settings_insert_own" ON "public"."notification_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "notification_settings_select_own" ON "public"."notification_settings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "notification_settings_update_own" ON "public"."notification_settings" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));

-- Notifications
CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "notifications_insert_service" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."can_join_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_join_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_join_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."can_user_be_invited_or_is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_be_invited_or_is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_be_invited_or_is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";

GRANT ALL ON FUNCTION "public"."consume_invite_token"("p_invite_token" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."consume_invite_token"("p_invite_token" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_invite_token"("p_invite_token" "text", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."is_attendee"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_attendee"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_attendee"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_event_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_invited"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organizer"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_user_attending_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_attending_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_attending_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."manage_attendee_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."manage_attendee_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_attendee_changes"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_event_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_event_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_event_update"() TO "service_role";

GRANT ALL ON FUNCTION "public"."send_event_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_event_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_event_reminders"() TO "service_role";

GRANT ALL ON FUNCTION "public"."send_event_reminders_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_event_reminders_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_event_reminders_safe"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON FUNCTION "public"."vacuum_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."vacuum_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."vacuum_notifications"() TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_invite_token"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invite_token"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_token"("invite_token" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_username"("username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_username"("username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_username"("username" "text") TO "service_role";

GRANT ALL ON TABLE "public"."event_attendees" TO "anon";
GRANT ALL ON TABLE "public"."event_attendees" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendees" TO "service_role";

GRANT ALL ON TABLE "public"."event_invites" TO "anon";
GRANT ALL ON TABLE "public"."event_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."event_invites" TO "service_role";

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";

GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
