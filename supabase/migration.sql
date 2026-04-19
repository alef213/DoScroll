-- DoScroll database schema

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  photo TEXT,
  category TEXT,
  note TEXT,
  starred BOOLEAN DEFAULT FALSE,
  hidden BOOLEAN DEFAULT FALSE,
  hidden_until BIGINT,
  archived BOOLEAN DEFAULT FALSE,
  comments TEXT[] DEFAULT '{}',
  created_at BIGINT,
  domain TEXT
);

-- User categories table
CREATE TABLE IF NOT EXISTS user_categories (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  categories TEXT[] NOT NULL DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

-- Policies for posts
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_categories
CREATE POLICY "Users can view their own categories"
  ON user_categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON user_categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON user_categories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON user_categories FOR DELETE USING (auth.uid() = user_id);
