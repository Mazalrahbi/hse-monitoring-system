'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface NotificationPreference {
  preference_id: string;
  notification_type: string;
  enabled: boolean;
  frequency: string;
}

interface EmailNotificationPreferencesProps {
  userId?: string;
}

const NOTIFICATION_TYPES = [
  {
    type: 'kpi_status_change',
    label: 'KPI Status Changes',
    description: 'Get notified when a KPI status changes (e.g., from In Progress to Done)',
    icon: '🔔'
  },
  {
    type: 'kpi_value_update',
    label: 'KPI Value Updates',
    description: 'Get notified when KPI values are updated',
    icon: '📊'
  },
  {
    type: 'kpi_blocked_alert',
    label: 'Blocked KPI Alerts',
    description: 'Get notified when a KPI is marked as blocked (high priority)',
    icon: '⚠️'
  }
];

export function EmailNotificationPreferences({ userId }: EmailNotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (notificationType: string, currentValue: boolean) => {
    if (!userId) return;

    try {
      setSaving(notificationType);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          notification_type: notificationType,
          enabled: !currentValue,
          frequency: 'immediate'
        }, {
          onConflict: 'user_id,notification_type'
        });

      if (error) throw error;

      // Update local state
      setPreferences(prev => {
        const existing = prev.find(p => p.notification_type === notificationType);
        if (existing) {
          return prev.map(p => 
            p.notification_type === notificationType 
              ? { ...p, enabled: !currentValue }
              : p
          );
        } else {
          return [...prev, {
            preference_id: crypto.randomUUID(),
            notification_type: notificationType,
            enabled: !currentValue,
            frequency: 'immediate'
          }];
        }
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      alert('Failed to update notification preference');
    } finally {
      setSaving(null);
    }
  };

  const getPreferenceValue = (notificationType: string): boolean => {
    const pref = preferences.find(p => p.notification_type === notificationType);
    return pref?.enabled || false;
  };

  const getEnabledCount = (): number => {
    return preferences.filter(p => p.enabled).length;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span>Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Mail className="h-5 w-5 mr-2 text-primary" />
            <CardTitle>Email Notification Preferences</CardTitle>
          </div>
          <Badge variant={getEnabledCount() > 0 ? "default" : "secondary"}>
            {getEnabledCount()} / {NOTIFICATION_TYPES.length} Enabled
          </Badge>
        </div>
        <CardDescription>
          Choose which email notifications you want to receive. All notifications are disabled by default (opt-in).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Email notifications are opt-in
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                You will only receive emails for notification types you enable below. 
                Toggle any option to start receiving emails for that event type.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Type Toggles */}
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((notif) => {
            const isEnabled = getPreferenceValue(notif.type);
            const isSaving = saving === notif.type;

            return (
              <div
                key={notif.type}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isEnabled 
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950' 
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">{notif.icon}</span>
                      <h4 className="font-semibold text-base">{notif.label}</h4>
                      {isEnabled && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">
                      {notif.description}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePreference(notif.type, isEnabled)}
                    disabled={isSaving}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                      border-2 border-transparent transition-colors duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      ${isEnabled ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    >
                      {isSaving && (
                        <RefreshCw className="h-3 w-3 animate-spin m-1 text-gray-600" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {getEnabledCount() === 0 
                ? '❌ No email notifications enabled' 
                : `✅ You will receive ${getEnabledCount()} type${getEnabledCount() > 1 ? 's' : ''} of email notifications`
              }
            </span>
            <button
              onClick={loadPreferences}
              className="text-primary hover:text-primary/80 font-medium flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
