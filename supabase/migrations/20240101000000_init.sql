-- supabase/migrations/00000000000000_init.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES
-- ==========================================
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    neighbourhood text,
    latitude double precision,
    longitude double precision,
    location_radius integer DEFAULT 5, -- Default 5km
    neighbour_score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. NEARBY POSTS
-- ==========================================
CREATE TABLE public.nearby_posts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    images text[] DEFAULT ARRAY[]::text[],
    latitude double precision,
    longitude double precision,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a spatial index for location-based queries
CREATE INDEX nearby_posts_geo_index ON public.nearby_posts USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- RLS
ALTER TABLE public.nearby_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone." ON public.nearby_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert posts." ON public.nearby_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own posts." ON public.nearby_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts." ON public.nearby_posts FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. HELP PROFILES
-- ==========================================
CREATE TABLE public.help_profiles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    category text NOT NULL,
    description text NOT NULL,
    is_verified boolean DEFAULT false,
    rating numeric(3, 2) DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.help_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Help profiles are viewable by everyone." ON public.help_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert their help profile." ON public.help_profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own help profile." ON public.help_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own help profile." ON public.help_profiles FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. HELP REQUESTS (Need It Now)
-- ==========================================
CREATE TABLE public.help_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'expired')),
    latitude double precision,
    longitude double precision,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX help_requests_geo_index ON public.help_requests USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Help requests are viewable by everyone." ON public.help_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert requests." ON public.help_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own requests." ON public.help_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own requests." ON public.help_requests FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 5. COMMENTS
-- ==========================================
CREATE TABLE public.comments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nearby_post_id uuid REFERENCES public.nearby_posts(id) ON DELETE CASCADE,
    help_request_id uuid REFERENCES public.help_requests(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (
        (nearby_post_id IS NOT NULL AND help_request_id IS NULL) OR
        (nearby_post_id IS NULL AND help_request_id IS NOT NULL)
    )
);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone." ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments." ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own comments." ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments." ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 6. REACTIONS
-- ==========================================
CREATE TABLE public.reactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    nearby_post_id uuid REFERENCES public.nearby_posts(id) ON DELETE CASCADE,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, nearby_post_id)
);

-- RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are viewable by everyone." ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reactions." ON public.reactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own reactions." ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 7. NOTIFICATIONS
-- ==========================================
CREATE TABLE public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL, -- 'comment', 'reaction', 'system'
    content text NOT NULL,
    related_link text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications." ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications." ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications." ON public.notifications FOR DELETE USING (auth.uid() = user_id);
-- System creates notifications via triggers/functions, no insert policy for users.

-- ==========================================
-- 8. TRUST METRICS
-- ==========================================
CREATE TABLE public.trust_metrics (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    recommendations_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    contributions_count integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.trust_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trust metrics are viewable by everyone." ON public.trust_metrics FOR SELECT USING (true);
-- Trust metrics are updated via triggers/functions, no insert/update/delete policy for users.

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.trust_metrics (user_id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_nearby_posts_updated_at BEFORE UPDATE ON public.nearby_posts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_help_profiles_updated_at BEFORE UPDATE ON public.help_profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON public.help_requests FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_trust_metrics_updated_at BEFORE UPDATE ON public.trust_metrics FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ==========================================
-- STORAGE
-- ==========================================
-- Assuming 'images' bucket exists (need to ensure this gets created or managed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT DO NOTHING;
-- Storage RLS policies for 'images' bucket (handled by Supabase UI usually, but adding basics if possible in SQL)
-- For a local MVP, it's easier to create the bucket via the dashboard or seed, but we can't do RLS on storage via standard migration easily if the extension isn't loaded right. We will assume the bucket is created manually or via seed if needed.
