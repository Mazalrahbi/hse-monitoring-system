'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { LoginPage } from '@/components/auth/LoginPage';
import { KpiGrid } from '@/components/grid/KpiGrid';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { excelExportService } from '@/lib/services/excelExport';
import { ToastProvider } from '@/components/ui/toast';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading HSE Monitoring System...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !appUser) {
    return <LoginPage />;
  }

  // Show main application
  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                HSE Monitoring System
              </h1>
              <p className="text-sm text-gray-600">
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
              <div className="flex items-center space-x-3 border-l pl-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {appUser.display_name || appUser.email}
                  </p>
                  <div className="flex items-center justify-end space-x-2">
                    <p className="text-xs text-gray-600">
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
          <div className="bg-white rounded-lg shadow-md border-2">
            <div className="p-4 border-b-2 bg-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">HSE Monitoring Plan - 2025</h2>
                <div className="flex items-center space-x-4">
                  <Badge variant="default" className="bg-green-500">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    Live
                  </Badge>
                  <span className="text-sm font-bold text-gray-800">
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

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t-2 border-gray-700 px-4 py-2 z-10">
        <div className="flex items-center justify-between text-sm font-medium text-white">
          <div className="flex items-center space-x-4">
            <span>🟢 Connected to Supabase</span>
            <span>👤 {appUser.display_name || appUser.email}</span>
            <span>📝 Last sync: just now</span>
          </div>
          <div>
            Built with Next.js • Supabase • Real-time collaboration
          </div>
        </div>
      </div>
      </div>
    </ToastProvider>
  );
}
