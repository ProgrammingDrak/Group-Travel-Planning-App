-- ============================================================================
-- TripSync: Social Features Migration
-- Adds profiles, follows, adventure posts, tags, and likes
-- ============================================================================

-- ==========================================================
-- 1. Profiles (linked to Supabase Auth)
-- ==========================================================
CREATE TABLE profiles (
    id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        text        UNIQUE NOT NULL,
    display_name    text        NOT NULL,
    bio             text        DEFAULT '',
    avatar_url      text        DEFAULT '',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_username ON profiles (username);

-- Auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ==========================================================
-- 2. Follows
-- ==========================================================
CREATE TABLE follows (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      timestamptz DEFAULT now(),

    UNIQUE (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower  ON follows (follower_id);
CREATE INDEX idx_follows_following ON follows (following_id);

-- ==========================================================
-- 3. Adventure Posts (published trip snapshots)
-- ==========================================================
CREATE TABLE adventure_posts (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trip_id         uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    caption         text        DEFAULT '',
    cover_image_url text        DEFAULT '',
    visibility      text        NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'followers', 'private')),
    published_at    timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),

    UNIQUE (profile_id, trip_id)
);

CREATE INDEX idx_adventure_posts_profile    ON adventure_posts (profile_id);
CREATE INDEX idx_adventure_posts_trip       ON adventure_posts (trip_id);
CREATE INDEX idx_adventure_posts_published  ON adventure_posts (published_at DESC);

CREATE TRIGGER trg_adventure_posts_updated_at
    BEFORE UPDATE ON adventure_posts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ==========================================================
-- 4. Adventure Tags (tag other users in posts)
-- ==========================================================
CREATE TABLE adventure_tags (
    id                  uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
    adventure_post_id   uuid    NOT NULL REFERENCES adventure_posts(id) ON DELETE CASCADE,
    tagged_profile_id   uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    UNIQUE (adventure_post_id, tagged_profile_id)
);

CREATE INDEX idx_adventure_tags_post    ON adventure_tags (adventure_post_id);
CREATE INDEX idx_adventure_tags_profile ON adventure_tags (tagged_profile_id);

-- ==========================================================
-- 5. Adventure Likes
-- ==========================================================
CREATE TABLE adventure_likes (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    adventure_post_id   uuid        NOT NULL REFERENCES adventure_posts(id) ON DELETE CASCADE,
    profile_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at          timestamptz DEFAULT now(),

    UNIQUE (adventure_post_id, profile_id)
);

CREATE INDEX idx_adventure_likes_post ON adventure_likes (adventure_post_id);

-- ==========================================================
-- 6. View: Adventure posts with stats
-- ==========================================================
CREATE VIEW adventure_posts_with_stats AS
SELECT
    ap.id,
    ap.profile_id,
    ap.trip_id,
    ap.caption,
    ap.cover_image_url,
    ap.visibility,
    ap.published_at,
    ap.updated_at,
    p.username          AS author_username,
    p.display_name      AS author_display_name,
    p.avatar_url        AS author_avatar_url,
    t.name              AS trip_name,
    t.destination       AS trip_destination,
    t.start_date        AS trip_start_date,
    t.end_date          AS trip_end_date,
    t.total_budget      AS trip_budget,
    t.budget_type       AS trip_budget_type,
    COALESCE(lk.like_count, 0)::integer AS like_count,
    COALESCE(tg.tag_count, 0)::integer  AS tag_count,
    (SELECT COUNT(*)::integer FROM participants pt WHERE pt.trip_id = ap.trip_id) AS participant_count
FROM adventure_posts ap
JOIN profiles p ON p.id = ap.profile_id
JOIN trips t ON t.id = ap.trip_id
LEFT JOIN (
    SELECT adventure_post_id, COUNT(*) AS like_count
    FROM adventure_likes
    GROUP BY adventure_post_id
) lk ON lk.adventure_post_id = ap.id
LEFT JOIN (
    SELECT adventure_post_id, COUNT(*) AS tag_count
    FROM adventure_tags
    GROUP BY adventure_post_id
) tg ON tg.adventure_post_id = ap.id;

-- ==========================================================
-- 7. RLS Policies
-- ==========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE adventure_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE adventure_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE adventure_likes ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update
CREATE POLICY "Profiles are publicly readable"
    ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Follows: anyone can read, authenticated users manage own follows
CREATE POLICY "Follows are publicly readable"
    ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others"
    ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Adventure posts: public posts readable by all, followers-only by followers
CREATE POLICY "Public adventure posts are readable"
    ON adventure_posts FOR SELECT USING (
        visibility = 'public'
        OR profile_id = auth.uid()
        OR (visibility = 'followers' AND EXISTS (
            SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = adventure_posts.profile_id
        ))
    );
CREATE POLICY "Users can create own adventure posts"
    ON adventure_posts FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own adventure posts"
    ON adventure_posts FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete own adventure posts"
    ON adventure_posts FOR DELETE USING (auth.uid() = profile_id);

-- Adventure tags: readable with post, creator can manage
CREATE POLICY "Adventure tags are readable"
    ON adventure_tags FOR SELECT USING (true);
CREATE POLICY "Post author can manage tags"
    ON adventure_tags FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM adventure_posts WHERE id = adventure_post_id AND profile_id = auth.uid())
    );
CREATE POLICY "Post author can remove tags"
    ON adventure_tags FOR DELETE USING (
        EXISTS (SELECT 1 FROM adventure_posts WHERE id = adventure_post_id AND profile_id = auth.uid())
    );

-- Adventure likes: readable, users manage own likes
CREATE POLICY "Adventure likes are readable"
    ON adventure_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts"
    ON adventure_likes FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can unlike posts"
    ON adventure_likes FOR DELETE USING (auth.uid() = profile_id);

-- ==========================================================
-- 8. Enable Realtime
-- ==========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE adventure_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE adventure_posts;
