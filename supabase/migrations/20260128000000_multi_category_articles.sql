-- Add categories column as an array of blog_category
ALTER TABLE articles ADD COLUMN categories blog_category[] DEFAULT '{}';

-- Migrate existing data from category to categories
UPDATE articles SET categories = ARRAY[category];

-- Make categories NOT NULL after migration
ALTER TABLE articles ALTER COLUMN categories SET NOT NULL;

-- Drop old category column
ALTER TABLE articles DROP COLUMN category;
