-- Add new categories to blog_category enum
ALTER TYPE blog_category ADD VALUE IF NOT EXISTS 'International Students';
ALTER TYPE blog_category ADD VALUE IF NOT EXISTS 'Admissions Guide';
