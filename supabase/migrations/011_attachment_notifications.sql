-- Add attachment notification type to existing users
INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
SELECT 
  user_id,
  'attachment_uploaded',
  false, -- DISABLED BY DEFAULT (opt-in)
  'immediate'
FROM app_user
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- Update the default preferences function to include attachment notifications
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
  VALUES 
    (NEW.user_id, 'kpi_status_change', false, 'immediate'),
    (NEW.user_id, 'kpi_value_update', false, 'immediate'),
    (NEW.user_id, 'kpi_blocked_alert', false, 'immediate'),
    (NEW.user_id, 'attachment_uploaded', false, 'immediate')
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when attachments are uploaded to kpi_attachment
CREATE OR REPLACE FUNCTION notify_kpi_attachment_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_kpi RECORD;
  v_period RECORD;
  v_kpi_value RECORD;
  v_uploader RECORD;
BEGIN
  -- Only notify on INSERT of active attachments
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    
    -- Get KPI value, KPI and period details
    SELECT * INTO v_kpi_value FROM kpi_value WHERE value_id = NEW.kpi_value_id;
    SELECT * INTO v_kpi FROM kpi WHERE kpi_id = v_kpi_value.kpi_id;
    SELECT * INTO v_period FROM kpi_period WHERE period_id = v_kpi_value.period_id;
    SELECT * INTO v_uploader FROM app_user WHERE user_id = NEW.uploaded_by::text;
    
    -- Find users who should be notified
    FOR v_user IN 
      SELECT DISTINCT u.user_id, u.email, u.display_name
      FROM app_user u
      INNER JOIN notification_preferences np 
        ON np.user_id = u.user_id
      WHERE np.notification_type = 'attachment_uploaded'
        AND np.enabled = true
        AND np.frequency = 'immediate'
        AND u.email_notifications = true
        AND u.email IS NOT NULL
        AND u.user_id != NEW.uploaded_by::text  -- Don't notify the uploader
        AND (
          v_kpi.owner_user_id = u.user_id  -- Notify KPI owner
          OR EXISTS (  -- Notify admins and managers
            SELECT 1 FROM user_role ur
            INNER JOIN role r ON r.role_id = ur.role_id
            WHERE ur.user_id = u.user_id
            AND r.name IN ('Admin', 'HSE Manager')
          )
        )
    LOOP
      -- Create notification in queue
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        subject,
        body,
        data,
        status
      ) VALUES (
        v_user.user_id,
        'attachment_uploaded',
        format('New Attachment: %s', v_kpi.name),
        format(
          '<html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                .content { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .file-info { background: #f0f0f0; padding: 12px; border-radius: 4px; margin: 10px 0; }
                .footer { color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2 style="color: #D4AF37;">📎 New Attachment Uploaded</h2>
                <div class="content">
                  <p><strong>KPI:</strong> %s (%s)</p>
                  <p><strong>Period:</strong> %s</p>
                  <div class="file-info">
                    <p style="margin: 4px 0;"><strong>File:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Size:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Uploaded by:</strong> %s</p>
                  </div>
                  <p><strong>Uploaded:</strong> %s</p>
                </div>
                <p style="text-align: center;">
                  <a href="https://datara.digital" class="button">View Attachment →</a>
                </p>
                <p class="footer">
                  You received this because you have attachment notifications enabled. 
                  <a href="https://datara.digital/settings">Manage notification preferences</a>
                </p>
              </div>
            </body>
          </html>',
          v_kpi.name,
          v_kpi.code,
          v_period.label,
          NEW.file_name,
          pg_size_pretty(NEW.file_size::bigint),
          COALESCE(v_uploader.display_name, v_uploader.email, 'Unknown User'),
          TO_CHAR(NEW.uploaded_at, 'Mon DD, YYYY at HH12:MI AM')
        ),
        jsonb_build_object(
          'kpi_id', v_kpi_value.kpi_id,
          'period_id', v_kpi_value.period_id,
          'attachment_id', NEW.attachment_id,
          'file_name', NEW.file_name,
          'uploaded_by', NEW.uploaded_by
        ),
        'pending'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when attachments are uploaded to evidence_attachment
CREATE OR REPLACE FUNCTION notify_evidence_attachment_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_kpi RECORD;
  v_period RECORD;
  v_kpi_value RECORD;
  v_uploader RECORD;
BEGIN
  -- Only notify on INSERT of active attachments
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    
    -- Get KPI value, KPI and period details
    SELECT * INTO v_kpi_value FROM kpi_value WHERE value_id = NEW.kpi_value_id;
    SELECT * INTO v_kpi FROM kpi WHERE kpi_id = v_kpi_value.kpi_id;
    SELECT * INTO v_period FROM kpi_period WHERE period_id = v_kpi_value.period_id;
    SELECT * INTO v_uploader FROM app_user WHERE user_id = NEW.uploaded_by::text;
    
    -- Find users who should be notified
    FOR v_user IN 
      SELECT DISTINCT u.user_id, u.email, u.display_name
      FROM app_user u
      INNER JOIN notification_preferences np 
        ON np.user_id = u.user_id
      WHERE np.notification_type = 'attachment_uploaded'
        AND np.enabled = true
        AND np.frequency = 'immediate'
        AND u.email_notifications = true
        AND u.email IS NOT NULL
        AND u.user_id != NEW.uploaded_by::text  -- Don't notify the uploader
        AND (
          v_kpi.owner_user_id = u.user_id  -- Notify KPI owner
          OR EXISTS (  -- Notify admins and managers
            SELECT 1 FROM user_role ur
            INNER JOIN role r ON r.role_id = ur.role_id
            WHERE ur.user_id = u.user_id
            AND r.name IN ('Admin', 'HSE Manager')
          )
        )
    LOOP
      -- Create notification in queue
      INSERT INTO notification_queue (
        user_id,
        notification_type,
        subject,
        body,
        data,
        status
      ) VALUES (
        v_user.user_id,
        'attachment_uploaded',
        format('New Evidence: %s', v_kpi.name),
        format(
          '<html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                .content { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .file-info { background: #f0f0f0; padding: 12px; border-radius: 4px; margin: 10px 0; }
                .footer { color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2 style="color: #D4AF37;">📎 New Evidence Uploaded</h2>
                <div class="content">
                  <p><strong>KPI:</strong> %s (%s)</p>
                  <p><strong>Period:</strong> %s</p>
                  <div class="file-info">
                    <p style="margin: 4px 0;"><strong>File:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Size:</strong> %s</p>
                    <p style="margin: 4px 0;"><strong>Uploaded by:</strong> %s</p>
                  </div>
                  <p><strong>Uploaded:</strong> %s</p>
                </div>
                <p style="text-align: center;">
                  <a href="https://datara.digital" class="button">View Evidence →</a>
                </p>
                <p class="footer">
                  You received this because you have attachment notifications enabled. 
                  <a href="https://datara.digital/settings">Manage notification preferences</a>
                </p>
              </div>
            </body>
          </html>',
          v_kpi.name,
          v_kpi.code,
          v_period.label,
          NEW.file_name,
          pg_size_pretty(NEW.file_size::bigint),
          COALESCE(v_uploader.display_name, v_uploader.email, 'Unknown User'),
          TO_CHAR(NEW.uploaded_at, 'Mon DD, YYYY at HH12:MI AM')
        ),
        jsonb_build_object(
          'kpi_id', v_kpi_value.kpi_id,
          'period_id', v_kpi_value.period_id,
          'attachment_id', NEW.attachment_id,
          'file_name', NEW.file_name,
          'uploaded_by', NEW.uploaded_by
        ),
        'pending'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for kpi_attachment table
DROP TRIGGER IF EXISTS trigger_kpi_attachment_notification ON kpi_attachment;
CREATE TRIGGER trigger_kpi_attachment_notification
  AFTER INSERT ON kpi_attachment
  FOR EACH ROW
  EXECUTE FUNCTION notify_kpi_attachment_upload();

-- Create trigger for evidence_attachment table
DROP TRIGGER IF EXISTS trigger_evidence_attachment_notification ON evidence_attachment;
CREATE TRIGGER trigger_evidence_attachment_notification
  AFTER INSERT ON evidence_attachment
  FOR EACH ROW
  EXECUTE FUNCTION notify_evidence_attachment_upload();

COMMENT ON FUNCTION notify_kpi_attachment_upload() IS 'Sends email notifications when attachments are uploaded to kpi_attachment (only to users with notifications ENABLED)';
COMMENT ON FUNCTION notify_evidence_attachment_upload() IS 'Sends email notifications when attachments are uploaded to evidence_attachment (only to users with notifications ENABLED)';
