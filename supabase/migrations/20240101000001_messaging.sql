-- supabase/migrations/20240101000001_messaging.sql
-- Messaging + richer notifications for Aas-Paas.
--
-- NOTE ON THE CURRENT BUILD: the Aas-Paas web app runs on the local demo data
-- layer (src/lib/db/local-db.ts) — every feature (Nearby, Help, Need, profiles)
-- reads/writes localStorage, with Supabase used for authentication only.
-- This migration makes the same logical schema available on the hosted
-- Supabase project so the messaging layer can move server-side without a
-- rewrite. It is safe to apply at any time (`supabase db push`).

-- ==========================================
-- CONVERSATIONS (direct + group)
-- ==========================================
CREATE TABLE public.conversations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    name text,
    avatar_url text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.conversation_members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.message_reads (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    last_read_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (conversation_id, user_id)
);

-- Notifications gain an optional actor (who triggered the event).
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS conversation_members_user_idx
    ON public.conversation_members (user_id);
CREATE INDEX IF NOT EXISTS conversation_members_conversation_idx
    ON public.conversation_members (conversation_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx
    ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS message_reads_user_idx
    ON public.message_reads (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx
    ON public.notifications (user_id, is_read, created_at DESC);

-- ==========================================
-- HELPER + TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conv_id AND cm.user_id = uid
  );
$$;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Conversations: members can view/update; creator can delete.
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "Members can update conversations"
  ON public.conversations FOR UPDATE
  USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Owners can delete conversations"
  ON public.conversations FOR DELETE
  USING (created_by = auth.uid());

-- Members: members can view; users can manage themselves; owners/admins manage others.
CREATE POLICY "Members can view conversation members"
  ON public.conversation_members FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
-- A user may only add themselves to a conversation they created (the group
-- creation flow). They can never self-join an existing DM or group.
CREATE POLICY "Users can join as themselves"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );
CREATE POLICY "Owners can add members"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid());
CREATE POLICY "Owners can remove members"
  ON public.conversation_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Messages: members can view; members can send their own.
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));

-- Message reads: members can view; users manage their own rows.
CREATE POLICY "Members can view message reads"
  ON public.message_reads FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Users can manage own message reads"
  ON public.message_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- REALTIME
-- ==========================================
-- `ALTER PUBLICATION ... ADD TABLE IF NOT EXISTS` is not available on every
-- supported PostgreSQL version, so guard each statement with an exception
-- handler instead of relying on the optional clause.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.conversations',
    'public.conversation_members',
    'public.messages',
    'public.message_reads',
    'public.notifications'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already published
    END;
  END LOOP;
END $$;
