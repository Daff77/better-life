CREATE TABLE IF NOT EXISTS assistant_chats (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id text NOT NULL, data jsonb NOT NULL, updated_at text NOT NULL, deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS assistant_chats_user_idx ON assistant_chats(user_id);
