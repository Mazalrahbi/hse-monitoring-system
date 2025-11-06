-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false, -- DISABLED BY DEFAULT
  frequency TEXT DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Log Table
CREATE TABLE IF NOT EXISTS notification_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_log_user_date ON notification_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON notification_preferences(user_id);

-- Create default preferences for existing users (DISABLED by default)
INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
SELECT 
  user_id,
  notification_type,
  false, -- DISABLED BY DEFAULT
  'immediate'
FROM app_user
CROSS JOIN (
  VALUES 
    ('kpi_status_change'),
    ('kpi_value_update'),
    ('kpi_blocked_alert')
) AS types(notification_type)
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, notification_type, enabled, frequency)
  VALUES 
    (NEW.user_id, 'kpi_status_change', false, 'immediate'),
    (NEW.user_id, 'kpi_value_update', false, 'immediate'),
    (NEW.user_id, 'kpi_blocked_alert', false, 'immediate')
  ON CONFLICT (user_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences for new users
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON app_user
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own notification logs"
  ON notification_log FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notification_queue TO authenticated;
GRANT ALL ON notification_log TO authenticated;

COMMENT ON TABLE notification_preferences IS 'User notification preferences - disabled by default (opt-in model)';
COMMENT ON TABLE notification_queue IS 'Queue for pending notifications to be sent';
COMMENT ON TABLE notification_log IS 'Historical log of all sent notifications';
