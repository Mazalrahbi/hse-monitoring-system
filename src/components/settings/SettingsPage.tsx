'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { 
  User, 
  Bell, 
  Download, 
  Shield, 
  Palette, 
  Globe,
  Save,
  RefreshCw
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  department: string | null;
  role: string;
  created_at: string;
}

interface UserSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  real_time_updates: boolean;
  export_format: 'xlsx' | 'pdf';
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  auto_save_interval: number;
}

export function SettingsPage() {
  const { user, appUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications_enabled: true,
    email_notifications: true,
    real_time_updates: true,
    export_format: 'xlsx',
    theme: 'light',
    language: 'en',
    auto_save_interval: 30
  });
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appUser) {
      loadUserProfile();
      loadUserSettings();
    }
  }, [appUser]);

  const loadUserProfile = async () => {
    if (!appUser) return;
    
    try {
      console.log('Loading profile for user_id:', appUser.user_id);
      
      const { data, error } = await supabase
        .from('app_user')
        .select(`
          user_id,
          email,
          display_name,
          department,
          created_at
        `)
        .eq('user_id', appUser.user_id)
        .single();

      if (error) throw error;

      // Get user role separately
      const { data: roleData } = await supabase
        .from('user_role')
        .select(`
          role (
            name
          )
        `)
        .eq('user_id', appUser.user_id)
        .limit(1)
        .single();

      const profile: UserProfile = {
        id: data.user_id,
        email: data.email,
        display_name: data.display_name,
        department: data.department,
        created_at: data.created_at,
        role: (roleData as any)?.role?.name || 'Viewer'
      };

      setUserProfile(profile);
      setDisplayName(profile.display_name || '');
      setDepartment(profile.department || '');
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserSettings = async () => {
    if (!appUser) return;
    
    try {
      console.log('Loading settings for user_id:', appUser.user_id);
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', appUser.user_id)
        .single();

      if (data) {
        setUserSettings({
          notifications_enabled: data.notifications_enabled ?? true,
          email_notifications: data.email_notifications ?? true,
          real_time_updates: data.real_time_updates ?? true,
          export_format: data.export_format || 'xlsx',
          theme: data.theme || 'light',
          language: data.language || 'en',
          auto_save_interval: data.auto_save_interval || 30
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!userProfile || !appUser) {
      console.error('Missing data:', { userProfile: !!userProfile, appUser: !!appUser });
      alert('Error: User data not loaded. Please refresh the page.');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving profile for user_id:', appUser.user_id);
      console.log('Current auth user:', user?.id);
      console.log('App user auth_user_id:', appUser.auth_user_id);
      console.log('Data to save:', { display_name: displayName.trim() || null, department: department.trim() || null });
      
      const { data, error } = await supabase
        .from('app_user')
        .update({
          display_name: displayName.trim() || null,
          department: department.trim() || null
        })
        .eq('user_id', appUser.user_id)
        .select();

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      console.log('Profile update successful:', data);

      // Try to log the change (optional - don't fail if this fails)
      try {
        await supabase
          .from('change_set')
          .insert({
            entity: 'app_user',
            entity_id: appUser.user_id,
            field: 'profile_update',
            new_value: JSON.stringify({ display_name: displayName, department }),
            changed_by: appUser.user_id,
            reason: 'Profile update from settings',
            source_page: '/settings'
          });
      } catch (auditError) {
        console.warn('Audit logging failed (non-critical):', auditError);
      }

      setUserProfile({
        ...userProfile,
        display_name: displayName.trim() || null,
        department: department.trim() || null
      });

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!appUser) return;

    setSaving(true);
    try {
      console.log('Saving settings for user_id:', appUser.user_id);
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: appUser.user_id,
          ...userSettings
        });

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <Badge variant="secondary" className="mt-2">
                {userProfile?.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your department"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Control how you receive notifications and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Browser Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications in your browser</p>
            </div>
            <input
              type="checkbox"
              checked={userSettings.notifications_enabled}
              onChange={(e) => setUserSettings({...userSettings, notifications_enabled: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={userSettings.email_notifications}
              onChange={(e) => setUserSettings({...userSettings, email_notifications: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Real-time Updates</h4>
              <p className="text-sm text-gray-600">See changes from other users instantly</p>
            </div>
            <input
              type="checkbox"
              checked={userSettings.real_time_updates}
              onChange={(e) => setUserSettings({...userSettings, real_time_updates: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Settings
          </CardTitle>
          <CardDescription>
            Configure your export preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Export Format</label>
            <select
              value={userSettings.export_format}
              onChange={(e) => setUserSettings({...userSettings, export_format: e.target.value as 'xlsx' | 'pdf'})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="xlsx">Excel (XLSX)</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Auto-save Interval (seconds)</label>
            <select
              value={userSettings.auto_save_interval}
              onChange={(e) => setUserSettings({...userSettings, auto_save_interval: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Appearance Settings
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <select
              value={userSettings.theme}
              onChange={(e) => setUserSettings({...userSettings, theme: e.target.value as 'light' | 'dark' | 'system'})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select
              value={userSettings.language}
              onChange={(e) => setUserSettings({...userSettings, language: e.target.value as 'en' | 'ar'})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Account Created</h4>
            <p className="text-sm text-blue-700">
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>

          <div className="flex space-x-4">
            <Button variant="outline" size="sm">
              Change Password
            </Button>
            <Button variant="outline" size="sm">
              View Active Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save All Settings */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={loadUserSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Saved
        </Button>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
