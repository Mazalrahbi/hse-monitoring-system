-- Create storage bucket for Excel templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-templates', 'excel-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated read templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin write templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin update templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete templates" ON storage.objects;

-- Allow authenticated users to read templates
CREATE POLICY "Allow authenticated read templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'excel-templates');

-- Allow admins to upload/update templates
CREATE POLICY "Allow admin write templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'excel-templates' 
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_role ur
    JOIN role r ON ur.role_id = r.role_id
    WHERE r.name = 'admin'
  )
);

-- Allow admins to update templates
CREATE POLICY "Allow admin update templates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'excel-templates' 
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_role ur
    JOIN role r ON ur.role_id = r.role_id
    WHERE r.name = 'admin'
  )
);

-- Allow admins to delete templates
CREATE POLICY "Allow admin delete templates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'excel-templates' 
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_role ur
    JOIN role r ON ur.role_id = r.role_id
    WHERE r.name = 'admin'
  )
);
