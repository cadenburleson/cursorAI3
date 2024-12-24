-- Add model column to existing table
ALTER TABLE side_hustle_generations
ADD COLUMN model TEXT;

-- Update existing rows to default to 'gpt-3.5-turbo'
UPDATE side_hustle_generations
SET model = 'gpt-3.5-turbo'
WHERE model IS NULL;

-- Make model column required for future entries
ALTER TABLE side_hustle_generations
ALTER COLUMN model SET NOT NULL; 