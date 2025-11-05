'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { LoginPage } from '@/components/auth/LoginPage';
import { KpiGrid } from '@/components/grid/KpiGrid';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { excelExportService } from '@/lib/services/excelExport';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Download, BarChart3, Users, Settings } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';

export function AppWrapper() {
  const { user, appUser, signOut, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'grid' | 'analytics' | 'admin' | 'settings'>('grid');
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    if (appUser) {
      fetchUserRoles();
    }
  }, [appUser]);

  const fetchUserRoles = async () => {
    if (!appUser) return;
    
    try {
      const { data: roleData, error } = await supabaseClient
        .from('user_role')
        .select(`
          role:role_id (
            name
          )
        `)
        .eq('user_id', appUser.user_id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return;
      }

      const roles = roleData?.map((item: any) => item.role?.name).filter(Boolean) || ['Viewer'];
      setUserRoles(roles.length > 0 ? roles : ['Viewer']);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles(['Viewer']);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await excelExportService.exportHSEMonitoringPlan();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--primary)' }}></div>
          <p className="mt-2" style={{ color: 'var(--primary)' }}>Loading HSE Monitoring System...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !appUser) {
    return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    );
  }

  // Show main application
  return (
    <ThemeProvider>
      <ToastProvider>
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="shadow-sm border-b-2" style={{ background: 'var(--card)', borderColor: 'var(--primary)' }}>
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                HSE Monitoring System
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Real-time collaborative KPI tracking and management
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant={currentView === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('grid')}
              >
                KPI Grid
              </Button>
              
              <Button
                variant={currentView === 'analytics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              
              <Button
                variant={currentView === 'admin' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('admin')}
              >
                <Users className="h-4 w-4 mr-2" />
                Admin
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              
              <Button 
                variant={currentView === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              {/* User Info */}
              <div className="flex items-center space-x-3 border-l pl-4" style={{ borderColor: 'var(--primary)' }}>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {appUser.display_name || appUser.email}
                  </p>
                  <div className="flex items-center justify-end space-x-2">
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {appUser.department || 'No Department'}
                    </p>
                    <div className="flex space-x-1">
                      {userRoles.map((role) => (
                        <Badge 
                          key={role}
                          variant={
                            role === 'Admin' ? 'destructive' :
                            role === 'Editor' ? 'default' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 py-6">
        {currentView === 'grid' && (
          <div className="rounded-lg shadow-md border-2" style={{ background: 'var(--background)', borderColor: 'var(--primary)' }}>
            <div className="p-4 border-b-2" style={{ borderColor: 'var(--primary)', background: 'var(--card)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>HSE Monitoring Plan - 2025</h2>
                <div className="flex items-center space-x-4">
                  <Badge variant="default" className="bg-emerald-600">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ background: 'var(--primary)' }}></div>
                    Live
                  </Badge>
                  <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    Last updated: {mounted ? new Date().toLocaleString() : 'Loading...'}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-auto">
              <KpiGrid />
            </div>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        )}

        {currentView === 'admin' && (
          <div className="space-y-6">
            <AdminPanel />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="space-y-6">
            <SettingsPage />
          </div>
        )}
      </main>

      </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
