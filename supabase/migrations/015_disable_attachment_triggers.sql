-- Temporarily disable attachment notification triggers to allow uploads
-- This will let you upload files without errors
-- We'll fix the notifications separately

-- Drop the triggers (they can be recreated later)
DROP TRIGGER IF EXISTS trigger_kpi_attachment_notification ON kpi_attachment;
DROP TRIGGER IF EXISTS trigger_evidence_attachment_notification ON evidence_attachment;

-- Keep the functions but they won't be called
COMMENT ON FUNCTION notify_kpi_attachment_upload() IS 'DISABLED: Trigger removed to allow uploads';
COMMENT ON FUNCTION notify_evidence_attachment_upload() IS 'DISABLED: Trigger removed to allow uploads';

-- You can now upload files without any notification-related errors
