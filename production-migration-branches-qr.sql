-- Migration: Add QR Code Customization Columns to Branches
-- Created: 2026-03-15
-- Description: Add QR code customization columns to branches table for production

-- Add QR code customization columns if they don't exist
DO $$ 
BEGIN 
  -- Add qr_logo_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'branches' AND column_name = 'qr_logo_url') THEN
    ALTER TABLE branches ADD COLUMN qr_logo_url TEXT DEFAULT '/logo_vibeclean.png';
  END IF;
  
  -- Add qr_color_dark column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'branches' AND column_name = 'qr_color_dark') THEN
    ALTER TABLE branches ADD COLUMN qr_color_dark TEXT DEFAULT '#1e40af';
  END IF;
  
  -- Add qr_color_light column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'branches' AND column_name = 'qr_color_light') THEN
    ALTER TABLE branches ADD COLUMN qr_color_light TEXT DEFAULT '#ffffff';
  END IF;
END $$;

-- Update existing branches with default values
UPDATE branches 
SET 
  qr_logo_url = COALESCE(qr_logo_url, '/logo_vibeclean.png'),
  qr_color_dark = COALESCE(qr_color_dark, '#1e40af'),
  qr_color_light = COALESCE(qr_color_light, '#ffffff')
WHERE qr_logo_url IS NULL OR qr_color_dark IS NULL OR qr_color_light IS NULL;

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS branches_organization_id_idx ON branches(organization_id);

-- Verify migration
SELECT 
  COUNT(*) as total_branches,
  COUNT(qr_logo_url) as with_logo,
  COUNT(qr_color_dark) as with_colors
FROM branches;
