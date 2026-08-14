-- supabase/migrations/20240101000002_production.sql
-- Aas-Paas production schema: profiles, posts, comments, reactions, messaging,
-- notifications, groups, reports, blocks, audit logs.
--
-- DESIGN NOTES
-- ------------
-- * This migration is IDEMPOTENT and composes with the earlier migrations
--   (0001 init, 0001 messaging): tables are created with IF NOT EXISTS and
--   existing tables are extended with ADD COLUMN IF NOT EXISTS.
-- * The legacy module tables (nearby_posts, help_profiles, help_requests,
--   comments, reactions) remain untouched — the local/demo layer uses them.
--   The production data layer uses the new tables below.
-- * RLS is enabled on every table. The browser (anon key) can only ever
--   touch rows the policies allow. Admin operations go through the
--   service-role client (server-only).

-- ==========================================
-- 1. PROFILES (extend existing)
-- ==========================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'disabled')),
    ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'neighbours', 'private'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (username)
    WHERE username IS NOT NULL;

-- ==========================================
-- 2. POSTS (unified community posts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    module text NOT NULL DEFAULT 'nearby' CHECK (module IN ('nearby', 'help', 'need')),
    title text,
    content text NOT NULL CHECK (char_length(content) <= 5000),
    category text,
    neighbourhood text,
    latitude double precision,
    longitude double precision,
    status text NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden', 'removed')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. POST COMMENTS (replies/threads)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (char_length(content) <= 2000),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone
);

-- ==========================================
-- 4. POST REACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reaction_type text NOT NULL CHECK (char_length(reaction_type) <= 32),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (post_id, user_id)
);

-- ==========================================
-- 5. GROUPS (community groups)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    description text CHECK (char_length(description) <= 1000),
    avatar_url text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (group_id, user_id)
);

-- ==========================================
-- 6. CONVERSATIONS (direct + group chats) — extend existing
-- ==========================================
ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_members
    ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS muted_until timestamp with time zone;

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'system')),
    ADD COLUMN IF NOT EXISTS attachment_url text,
    ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Read receipts: a message_reads row is either a conversation watermark
-- (conversation_id + last_read_at) or a per-message receipt (message_id + read_at).
ALTER TABLE public.message_reads
    ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- ==========================================
-- 7. NOTIFICATIONS — extend existing
-- ==========================================
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS entity_type text,
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- ==========================================
-- 8. REPORTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.reports (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'message', 'group')),
    target_id uuid NOT NULL,
    reason text NOT NULL CHECK (char_length(reason) <= 200),
    description text CHECK (char_length(description) <= 2000),
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 9. BLOCKS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    blocker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- ==========================================
-- 10. AUDIT LOGS (immutable, admin-only)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role text,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES (Phase 14)
-- ==========================================
CREATE INDEX IF NOT EXISTS posts_author_idx      ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS posts_created_idx     ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_post_idx   ON public.post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS post_reactions_post_idx  ON public.post_reactions (post_id);
CREATE INDEX IF NOT EXISTS conversations_members_user_idx ON public.conversation_members (user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS message_reads_message_idx ON public.message_reads (message_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS group_members_user_idx  ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS groups_privacy_idx      ON public.groups (privacy);
CREATE INDEX IF NOT EXISTS reports_status_idx      ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx      ON public.reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx    ON public.audit_logs (actor_id, created_at DESC);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Role helpers — SECURITY DEFINER so policies can check roles without
-- recursing into profile RLS.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('admin', 'super_admin') AND p.status = 'active'
  );
$$;

-- True when the account is not suspended/disabled. Used by INSERT policies so
-- a suspended user cannot keep posting, commenting or messaging.
CREATE OR REPLACE FUNCTION public.is_account_active(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role IN ('moderator', 'admin', 'super_admin') AND p.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid, uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = gid AND gm.user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conv_id AND cm.user_id = uid
  );
$$;

-- Record a notification. SECURITY DEFINER so trusted server-side flows
-- (triggers / service-role helpers) can insert for any recipient.
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient uuid, p_actor uuid, p_type text, p_title text,
    p_message text, p_entity_type text DEFAULT NULL, p_entity_id uuid DEFAULT NULL,
    p_link text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications
    (user_id, actor_id, type, title, content, entity_type, entity_id, related_link)
  VALUES
    (p_recipient, p_actor, p_type, p_title, p_message, p_entity_type, p_entity_id, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Extend the new-user handler to set the verified flag from auth metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, email_verified)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.trust_metrics (user_id) VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Keep profiles.email_verified in sync with auth confirmation.
CREATE OR REPLACE FUNCTION public.sync_profile_email_verified()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
     SET email_verified = (new.email_confirmed_at IS NOT NULL),
         updated_at = timezone('utc'::text, now())
   WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_email_verified();

-- Prevent a user from escalating their own role/status/verified flags.
-- Admin (service-role) writes bypass the check: with the service key,
-- auth.role() returns 'service_role' and auth.uid() is null.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin(auth.uid()) THEN
    RETURN new;
  END IF;
  IF new.role IS DISTINCT FROM old.role
     OR new.status IS DISTINCT FROM old.status
     OR new.email_verified IS DISTINCT FROM old.email_verified THEN
    RAISE EXCEPTION 'Not authorized to change role, status or verification flags';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_profile_privilege_escalation();

-- Reuse the shared updated_at trigger for the new tables.
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- ---- PROFILES ----
-- Profile reads require authentication; sensitive columns (email, last_seen)
-- are exposed only through the public_profiles view below, which never selects
-- them for other users. RLS is row-level, so the policy gates rows and the
-- view gates columns.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by the owner or everyone on public rows."
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (visibility = 'public' OR auth.uid() = id OR public.is_moderator(auth.uid()))
  );
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

---- POSTS ----
DROP POLICY IF EXISTS "Published posts are viewable by everyone." ON public.posts;
CREATE POLICY "Published posts are viewable by everyone."
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Authenticated active users can create posts." ON public.posts;
CREATE POLICY "Authenticated active users can create posts."
  ON public.posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Authors can update their posts." ON public.posts;
CREATE POLICY "Authors can update their posts."
  ON public.posts FOR UPDATE
  USING (author_id = auth.uid() OR public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Authors can delete their posts." ON public.posts;
CREATE POLICY "Authors can delete their posts."
  ON public.posts FOR DELETE
  USING (author_id = auth.uid() OR public.is_moderator(auth.uid()));

-- ---- POST COMMENTS ----
DROP POLICY IF EXISTS "Comments on visible posts are readable." ON public.post_comments;
CREATE POLICY "Comments on visible posts are readable."
  ON public.post_comments FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.status = 'published'
  ));
DROP POLICY IF EXISTS "Authenticated active users can comment." ON public.post_comments;
CREATE POLICY "Authenticated active users can comment."
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Authors can update their comments." ON public.post_comments;
CREATE POLICY "Authors can update their comments."
  ON public.post_comments FOR UPDATE
  USING (author_id = auth.uid() OR public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Authors can delete their comments." ON public.post_comments;
CREATE POLICY "Authors can delete their comments."
  ON public.post_comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_moderator(auth.uid()));

-- ---- POST REACTIONS ----
DROP POLICY IF EXISTS "Reactions are readable by everyone." ON public.post_reactions;
CREATE POLICY "Reactions are readable by everyone."
  ON public.post_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated active users can react." ON public.post_reactions;
CREATE POLICY "Authenticated active users can react."
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Users can remove their own reactions." ON public.post_reactions;
CREATE POLICY "Users can remove their own reactions."
  ON public.post_reactions FOR DELETE
  USING (user_id = auth.uid() OR public.is_moderator(auth.uid()));

-- ---- CONVERSATIONS / MESSAGES (members only, blocks enforced) ----
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "Members can update conversations" ON public.conversations;
CREATE POLICY "Members can update conversations"
  ON public.conversations FOR UPDATE
  USING (public.is_conversation_member(id, auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated active users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Owners can delete conversations" ON public.conversations;
CREATE POLICY "Owners can delete conversations"
  ON public.conversations FOR DELETE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
CREATE POLICY "Members can view conversation members"
  ON public.conversation_members FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Users can join as themselves" ON public.conversation_members;
CREATE POLICY "Users can join as themselves"
  ON public.conversation_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can add members" ON public.conversation_members;
CREATE POLICY "Owners can add members"
  ON public.conversation_members FOR INSERT
  WITH CHECK (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_members;
CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Owners can remove members" ON public.conversation_members;
CREATE POLICY "Owners can remove members"
  ON public.conversation_members FOR DELETE
  USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Messages: members only, and never between two users where one blocks the other.
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_conversation_member(conversation_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_members cm, public.conversation_members cm2, public.blocks b
      WHERE cm.conversation_id = conversation_id AND cm.user_id = sender_id
        AND cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid()
        AND ((b.blocker_id = sender_id AND b.blocked_id = auth.uid())
          OR (b.blocker_id = auth.uid() AND b.blocked_id = sender_id))
    )
  );
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_account_active(auth.uid())
    AND public.is_conversation_member(conversation_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_members cm2, public.blocks b
      WHERE cm2.conversation_id = conversation_id AND cm2.user_id <> auth.uid()
        AND ((b.blocker_id = auth.uid() AND b.blocked_id = cm2.user_id)
          OR (b.blocker_id = cm2.user_id AND b.blocked_id = auth.uid()))
    )
  );
DROP POLICY IF EXISTS "Senders can edit their messages" ON public.messages;
CREATE POLICY "Senders can edit their messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());
DROP POLICY IF EXISTS "Senders can delete their messages" ON public.messages;
CREATE POLICY "Senders can delete their messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid() OR public.is_moderator(auth.uid()));

DROP POLICY IF EXISTS "Members can view message reads" ON public.message_reads;
CREATE POLICY "Members can view message reads"
  ON public.message_reads FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Users can manage own message reads" ON public.message_reads;
CREATE POLICY "Users can manage own message reads"
  ON public.message_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- NOTIFICATIONS ----
DROP POLICY IF EXISTS "Users can view own notifications." ON public.notifications;
CREATE POLICY "Users can view own notifications."
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own notifications." ON public.notifications;
CREATE POLICY "Users can update own notifications."
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own notifications." ON public.notifications;
CREATE POLICY "Users can delete own notifications."
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- ---- GROUPS ----
DROP POLICY IF EXISTS "Public groups are viewable; private groups member-only." ON public.groups;
CREATE POLICY "Public groups are viewable; private groups member-only."
  ON public.groups FOR SELECT
  USING (privacy = 'public' OR public.is_group_member(id, auth.uid()));
DROP POLICY IF EXISTS "Authenticated active users can create groups." ON public.groups;
CREATE POLICY "Authenticated active users can create groups."
  ON public.groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Group owners can update groups." ON public.groups;
CREATE POLICY "Group owners can update groups."
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid() OR public.is_moderator(auth.uid()));

DROP POLICY IF EXISTS "Group members can be viewed by members." ON public.group_members;
CREATE POLICY "Group members can be viewed by members."
  ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));
DROP POLICY IF EXISTS "Users can join public groups." ON public.group_members;
CREATE POLICY "Users can join public groups."
  ON public.group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Group owners manage members." ON public.group_members;
CREATE POLICY "Group owners manage members."
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')
    )
  );
DROP POLICY IF EXISTS "Users can leave groups." ON public.group_members;
CREATE POLICY "Users can leave groups."
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Group owners remove members." ON public.group_members;
CREATE POLICY "Group owners remove members."
  ON public.group_members FOR DELETE
  USING (public.is_group_member(group_id, auth.uid()));

-- ---- REPORTS ----
DROP POLICY IF EXISTS "Reporters see their own reports." ON public.reports;
CREATE POLICY "Reporters see their own reports."
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_moderator(auth.uid()));
DROP POLICY IF EXISTS "Authenticated active users can file reports." ON public.reports;
CREATE POLICY "Authenticated active users can file reports."
  ON public.reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND reporter_id = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Moderators review reports." ON public.reports;
CREATE POLICY "Moderators review reports."
  ON public.reports FOR UPDATE
  USING (public.is_moderator(auth.uid()));

-- ---- BLOCKS ----
DROP POLICY IF EXISTS "Blocking users see their own blocks." ON public.blocks;
CREATE POLICY "Blocking users see their own blocks."
  ON public.blocks FOR SELECT
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
DROP POLICY IF EXISTS "Active users can block others." ON public.blocks;
CREATE POLICY "Active users can block others."
  ON public.blocks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND blocker_id = auth.uid() AND public.is_account_active(auth.uid()));
DROP POLICY IF EXISTS "Blockers can unblock." ON public.blocks;
CREATE POLICY "Blockers can unblock."
  ON public.blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- ---- AUDIT LOGS ----
DROP POLICY IF EXISTS "Admins can view audit logs." ON public.audit_logs;
CREATE POLICY "Admins can view audit logs."
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));
-- No INSERT/UPDATE/DELETE policies: audit logs are written only through the
-- service-role client (server-side).

-- ==========================================
-- PUBLIC PROFILE VIEW (column-level privacy)
-- ==========================================
-- Exposes only safe, public fields. security_invoker = true so the base
-- table's RLS still applies to the rows returned; email / last_seen_at are
-- never selected, so other users can never read them.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  bio,
  neighbourhood,
  city,
  neighbour_score,
  created_at
FROM public.profiles
WHERE visibility = 'public' OR auth.uid() = id;

-- ==========================================
-- REALTIME PUBLICATION
-- ==========================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.posts',
    'public.post_comments',
    'public.post_reactions',
    'public.conversations',
    'public.conversation_members',
    'public.messages',
    'public.message_reads',
    'public.notifications',
    'public.groups',
    'public.group_members',
    'public.reports',
    'public.blocks'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
