-- Migration to add attachment functionality for KPI values
-- This adds support for file attachments to monthly KPI entries

-- Create attachment table for KPI evidence/files
CREATE TABLE IF NOT EXISTS kpi_attachment (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_value_id UUID NOT NULL REFERENCES kpi_value(value_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_user(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kpi_attachment_kpi_value_id ON kpi_attachment(kpi_value_id);
CREATE INDEX IF NOT EXISTS idx_kpi_attachment_uploaded_by ON kpi_attachment(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_kpi_attachment_uploaded_at ON kpi_attachment(uploaded_at);

-- Add attachment_count column to kpi_value for quick reference
ALTER TABLE kpi_value ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Create function to update attachment count
CREATE OR REPLACE FUNCTION update_kpi_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE kpi_value 
        SET attachment_count = (
            SELECT COUNT(*) 
            FROM kpi_attachment 
            WHERE kpi_value_id = NEW.kpi_value_id AND is_active = true
        )
        WHERE value_id = NEW.kpi_value_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE kpi_value 
        SET attachment_count = (
            SELECT COUNT(*) 
            FROM kpi_attachment 
            WHERE kpi_value_id = OLD.kpi_value_id AND is_active = true
        )
        WHERE value_id = OLD.kpi_value_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle both old and new kpi_value_id in case it changes
        UPDATE kpi_value 
        SET attachment_count = (
            SELECT COUNT(*) 
            FROM kpi_attachment 
            WHERE kpi_value_id = OLD.kpi_value_id AND is_active = true
        )
        WHERE value_id = OLD.kpi_value_id;
        
        IF OLD.kpi_value_id != NEW.kpi_value_id THEN
            UPDATE kpi_value 
            SET attachment_count = (
                SELECT COUNT(*) 
                FROM kpi_attachment 
                WHERE kpi_value_id = NEW.kpi_value_id AND is_active = true
            )
            WHERE value_id = NEW.kpi_value_id;
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic attachment count updates
DROP TRIGGER IF EXISTS trg_kpi_attachment_count ON kpi_attachment;
CREATE TRIGGER trg_kpi_attachment_count
    AFTER INSERT OR UPDATE OR DELETE ON kpi_attachment
    FOR EACH ROW
    EXECUTE FUNCTION update_kpi_attachment_count();

-- Add updated_at trigger for kpi_attachment
CREATE TRIGGER update_kpi_attachment_updated_at 
    BEFORE UPDATE ON kpi_attachment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add evidence_summary field to kpi_value for quick text evidence
ALTER TABLE kpi_value ADD COLUMN IF NOT EXISTS evidence_summary TEXT;

-- Update existing attachment counts
UPDATE kpi_value 
SET attachment_count = (
    SELECT COUNT(*) 
    FROM kpi_attachment 
    WHERE kpi_value_id = kpi_value.value_id AND is_active = true
);

-- Add RLS policies for attachments (initially disabled for development)
ALTER TABLE kpi_attachment ENABLE ROW LEVEL SECURITY;

-- Policy for users to view attachments they have access to (via KPI access)
CREATE POLICY "Users can view attachments for accessible KPIs" ON kpi_attachment
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM kpi_value kv
            JOIN kpi k ON k.kpi_id = kv.kpi_id
            WHERE kv.value_id = kpi_attachment.kpi_value_id
        )
    );

-- Policy for users to insert attachments for accessible KPIs
CREATE POLICY "Users can upload attachments for accessible KPIs" ON kpi_attachment
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kpi_value kv
            JOIN kpi k ON k.kpi_id = kv.kpi_id
            WHERE kv.value_id = kpi_attachment.kpi_value_id
        )
    );

-- Policy for users to update their own attachments
CREATE POLICY "Users can update their own attachments" ON kpi_attachment
    FOR UPDATE
    TO authenticated
    USING (uploaded_by = auth.uid()::uuid);

-- Policy for users to delete their own attachments
CREATE POLICY "Users can delete their own attachments" ON kpi_attachment
    FOR DELETE
    TO authenticated
    USING (uploaded_by = auth.uid()::uuid);

-- Disable RLS for development (can be enabled later)
ALTER TABLE kpi_attachment DISABLE ROW LEVEL SECURITY;

-- Create view for attachment summary
CREATE OR REPLACE VIEW kpi_attachment_summary AS
SELECT 
    kv.value_id,
    kv.kpi_id,
    kv.period_id,
    COUNT(ka.attachment_id) as total_attachments,
    COUNT(ka.attachment_id) FILTER (WHERE ka.file_type LIKE 'image/%') as image_count,
    COUNT(ka.attachment_id) FILTER (WHERE ka.file_type LIKE 'application/pdf') as pdf_count,
    COUNT(ka.attachment_id) FILTER (WHERE ka.file_type NOT LIKE 'image/%' AND ka.file_type NOT LIKE 'application/pdf') as other_count,
    STRING_AGG(ka.file_name, ', ' ORDER BY ka.uploaded_at DESC) as file_names,
    MAX(ka.uploaded_at) as latest_upload
FROM kpi_value kv
LEFT JOIN kpi_attachment ka ON kv.value_id = ka.kpi_value_id AND ka.is_active = true
GROUP BY kv.value_id, kv.kpi_id, kv.period_id;

COMMENT ON TABLE kpi_attachment IS 'Stores file attachments for KPI values as evidence or supporting documentation';
COMMENT ON VIEW kpi_attachment_summary IS 'Summary view of attachments per KPI value for quick access';
