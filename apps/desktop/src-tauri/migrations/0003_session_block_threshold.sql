ALTER TABLE session
ADD COLUMN block_threshold TEXT CHECK (block_threshold IN ('none', 'distracting', 'neutral'));
