-- Function to handle KPI status change notifications
CREATE OR REPLACE FUNCTION notify_kpi_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_kpi RECORD;
  v_period RECORD;
  v_queue_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;
  
  -- Get KPI and period details
  SELECT * INTO v_kpi FROM kpi WHERE kpi_id = NEW.kpi_id;
  SELECT * INTO v_period FROM kpi_period WHERE period_id = NEW.period_id;
  
  -- Find users who should be notified (must have notifications ENABLED)
  FOR v_user IN 
    SELECT DISTINCT u.user_id, u.email, u.display_name
    FROM app_user u
    INNER JOIN notification_preferences np 
      ON np.user_id = u.user_id
    WHERE np.notification_type = 'kpi_status_change'
      AND np.enabled = true  -- ONLY ENABLED USERS
      AND np.frequency = 'immediate'
      AND u.email_notifications = true
      AND u.email IS NOT NULL
      AND (
        v_kpi.owner_user_id = u.user_id
        OR (NEW.status IN ('blocked', 'needs_review') 
           AND EXISTS (
             SELECT 1 FROM user_role ur
             INNER JOIN role r ON r.role_id = ur.role_id
             WHERE ur.user_id = u.user_id
             AND r.name IN ('Admin', 'HSE Manager')
           ))
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
      'kpi_status_change',
      format('KPI Status Updated: %s', v_kpi.name),
      format(
        '<html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
              .container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
              .content { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; background: #D4AF37; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
              .status-badge { padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; display: inline-block; }
              .footer { color: #666; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #D4AF37;">🔔 KPI Status Changed</h2>
              <div class="content">
                <p><strong>KPI:</strong> %s (%s)</p>
                <p><strong>Period:</strong> %s</p>
                <p><strong>New Status:</strong> 
                  <span class="status-badge" style="background: %s;">
                    %s
                  </span>
                </p>
                %s
                <p><strong>Changed:</strong> %s</p>
              </div>
              <p style="text-align: center;">
                <a href="https://datara.digital" class="button">View KPI in System →</a>
              </p>
              <p class="footer">
                You received this because you have KPI status notifications enabled. 
                <a href="https://datara.digital/settings">Manage notification preferences</a>
              </p>
            </div>
          </body>
        </html>',
        v_kpi.name,
        v_kpi.code,
        v_period.label,
        CASE NEW.status
          WHEN 'done' THEN '#10B981'
          WHEN 'in_progress' THEN '#3B82F6'
          WHEN 'blocked' THEN '#EF4444'
          WHEN 'needs_review' THEN '#F59E0B'
          ELSE '#9CA3AF'
        END,
        UPPER(REPLACE(NEW.status, '_', ' ')),
        CASE 
          WHEN TG_OP = 'UPDATE' THEN 
            format('<p><strong>Previous Status:</strong> <span style="color: #666;">%s</span></p>', UPPER(REPLACE(OLD.status, '_', ' ')))
          ELSE ''
        END,
        TO_CHAR(NOW(), 'Mon DD, YYYY at HH12:MI AM')
      ),
      jsonb_build_object(
        'kpi_id', NEW.kpi_id,
        'period_id', NEW.period_id,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      ),
      'pending'
    ) RETURNING queue_id INTO v_queue_id;
    
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_kpi_status_change ON kpi_value;
CREATE TRIGGER trigger_kpi_status_change
  AFTER INSERT OR UPDATE OF status ON kpi_value
  FOR EACH ROW
  EXECUTE FUNCTION notify_kpi_status_change();

COMMENT ON FUNCTION notify_kpi_status_change() IS 'Sends email notifications when KPI status changes (only to users with notifications ENABLED)';
