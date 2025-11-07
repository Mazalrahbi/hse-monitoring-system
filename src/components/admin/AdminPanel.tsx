'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabaseClient } from '@/lib/supabase/client';
import { TemplateManager } from '@/components/templates/TemplateManager';
import { 
  Users, 
  Shield, 
  FileText, 
  Download, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  UserPlus,
  Lock,
  Unlock,
  AlertTriangle,
  Calendar,
  Activity
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  department: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  is_active: boolean;
}

interface UserRoleResult {
  role: {
    name: string;
  } | null;
}

interface AuditLog {
  id: string;
  entity: string;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  source_page: string | null;
  user_name: string;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  created_at: string;
  version: number;
  is_active: boolean;
}

type AdminView = 'users' | 'audit' | 'templates' | 'system';

// Helper function to extract KPI info from reason field
const getKpiInfo = (reason: string | null) => {
  if (!reason) return null;
  const match = reason.match(/KPI: ([^\|]+) \| Month: (.+)/);
  if (match) {
    return { kpi: match[1].trim(), month: match[2].trim() };
  }
  return null;
};

// Helper function to format status values with color badges
const formatStatus = (status: string) => {
  const statusColors: { [key: string]: string } = {
    'not_started': 'bg-slate-100 text-slate-800',
    'in_progress': 'bg-amber-100 text-amber-800',
    'done': 'bg-emerald-100 text-emerald-800',
    'blocked': 'bg-red-100 text-red-800',
    'needs_review': 'bg-blue-100 text-blue-800'
  };
  
  const statusLabels: { [key: string]: string } = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'done': 'Done',
    'blocked': 'Blocked',
    'needs_review': 'Needs Review'
  };
  
  return {
    label: statusLabels[status] || status,
    className: statusColors[status] || 'bg-gray-100 text-gray-800'
  };
};

// Helper function to format value changes
const formatValueChange = (value: string | null) => {
  if (!value) return 'Empty';
  
  try {
    const parsed = JSON.parse(value);
    if (parsed.text !== undefined && parsed.text !== null) {
      return parsed.text;
    }
    if (parsed.numeric !== undefined && parsed.numeric !== null) {
      return parsed.numeric.toString();
    }
    return 'Empty';
  } catch {
    return value;
  }
};

// Helper function to create a readable change description for the new format
const formatChangeDescription = (log: AuditLog) => {
  const kpiInfo = getKpiInfo(log.reason);
  
  if (log.field === 'status_update') {
    const oldStatus = formatStatus(log.old_value || 'not_started');
    const newStatus = formatStatus(log.new_value || 'not_started');
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${oldStatus.className}`}>
          {oldStatus.label}
        </span>
        <span className="text-gray-400">→</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${newStatus.className}`}>
          {newStatus.label}
        </span>
      </div>
    );
  }
  
  if (log.field === 'value_update') {
    const oldValue = formatValueChange(log.old_value);
    const newValue = formatValueChange(log.new_value);
    
    return (
      <div className="flex items-center space-x-2">
        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
          {oldValue}
        </span>
        <span className="text-gray-400">→</span>
        <span className="px-2 py-1 bg-emerald-100 rounded text-xs font-mono text-emerald-800">
          {newValue}
        </span>
      </div>
    );
  }
  
  // Fallback for other field types
  return (
    <div className="text-xs text-gray-700">
      {log.old_value ? `From: ${log.old_value.substring(0, 30)}` : 'New'} → {log.new_value ? `To: ${log.new_value.substring(0, 30)}` : 'Removed'}
    </div>
  );
};

export function AdminPanel() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    loadData();
  }, [currentView]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (currentView) {
        case 'users':
          await loadUsers();
          break;
        case 'audit':
          await loadAuditLogs();
          break;
        case 'templates':
          await loadTemplates();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    console.log('Loading users...');
    
    try {
      // Load users with LEFT JOIN to handle users without roles
      // Specify the exact foreign key relationship to avoid ambiguity
      const { data: usersWithRoles, error: usersError } = await supabaseClient
        .from('app_user')
        .select(`
          user_id,
          email,
          display_name,
          department,
          created_at,
          last_login_at,
          is_active,
          user_role!user_role_user_id_fkey (
            role (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      console.log('Users query result:', { usersWithRoles, usersError });

      if (usersError) {
        console.error('Error loading users:', usersError);
        setUsers([]);
        return;
      }

      if (!usersWithRoles || usersWithRoles.length === 0) {
        console.log('No users found in database');
        setUsers([]);
        return;
      }

      // Process the joined data - handle users with or without roles
      const processedUsers = usersWithRoles.map((user: any) => {
        // user_role is an array, get first role if exists
        const roleData = user.user_role?.[0]?.role;
        const roleName = roleData?.name || 'viewer';
        
        return {
          id: user.user_id,
          email: user.email,
          display_name: user.display_name,
          department: user.department,
          created_at: user.created_at,
          last_sign_in_at: user.last_login_at,
          is_active: user.is_active ?? true,
          role: roleName
        };
      });

      console.log('Processed users:', processedUsers.length);
      setUsers(processedUsers);
    } catch (error) {
      console.error('Unexpected error loading users:', error);
      setUsers([]);
    }
  };

  const loadAuditLogs = async () => {
    console.log('Loading audit logs...');
    
    const { data, error } = await supabaseClient
      .from('change_set')
      .select(`
        change_id,
        entity,
        entity_id,
        field,
        old_value,
        new_value,
        changed_by,
        changed_at,
        reason,
        source_page,
        app_user!change_set_changed_by_fkey (
          display_name,
          email
        )
      `)
      .order('changed_at', { ascending: false})
      .limit(100);

    console.log('Audit logs query result:', { data, error });

    if (!error && data) {
      const logsWithUserNames = data.map(log => ({
        id: log.change_id,
        entity: log.entity,
        entity_id: log.entity_id,
        field: log.field,
        old_value: log.old_value,
        new_value: log.new_value,
        changed_by: log.changed_by,
        changed_at: log.changed_at,
        reason: log.reason,
        source_page: log.source_page,
        user_name: (log.app_user as any)?.display_name || (log.app_user as any)?.email || 'Unknown User'
      }));
      console.log('Processed audit logs:', logsWithUserNames);
      setAuditLogs(logsWithUserNames);
    } else {
      console.error('Error loading audit logs:', error);
      setAuditLogs([]);
    }
  };

  const loadTemplates = async () => {
    const { data, error } = await supabaseClient
      .from('export_template')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('app_user')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (!error) {
        loadUsers();
        
        // Log the action
        await supabaseClient
          .from('change_set')
          .insert({
            entity: 'app_user',
            entity_id: userId,
            field: 'is_active',
            old_value: currentStatus.toString(),
            new_value: (!currentStatus).toString(),
            changed_by: user?.id,
            reason: 'Admin panel user status change',
            source_page: '/admin'
          });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const changeUserRole = async (userId: string, newRoleId: string) => {
    try {
      // First remove existing role
      await supabaseClient
        .from('user_role')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabaseClient
        .from('user_role')
        .insert({
          user_id: userId,
          role_id: newRoleId
        });

      if (!error) {
        loadUsers();
        
        // Log the action
        await supabaseClient
          .from('change_set')
          .insert({
            entity: 'user_role',
            entity_id: userId,
            field: 'role_change',
            new_value: newRoleId,
            changed_by: user?.id,
            reason: 'Admin panel role change',
            source_page: '/admin'
          });
      }
    } catch (error) {
      console.error('Error changing user role:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const filteredAuditLogs = auditLogs.filter(log => 
    log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <Card>
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Administration Panel</h2>
            <div className="flex space-x-2">
              <Button
                variant={currentView === 'users' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
              
              <Button
                variant={currentView === 'audit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('audit')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Audit Trail
              </Button>
              
              <Button
                variant={currentView === 'templates' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('templates')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
              
              <Button
                variant={currentView === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('system')}
              >
                <Settings className="h-4 w-4 mr-2" />
                System
              </Button>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {currentView === 'users' && (
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
                <option value="Auditor">Auditor</option>
              </select>
            )}
            
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      {currentView === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Management ({filteredUsers.length} users)
              </div>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-900">User</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Role</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Department</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Last Sign In</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.display_name || user.email}</div>
                          <div className="text-gray-600 text-xs">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-gray-800 bg-gray-200">{user.role}</Badge>
                      </td>
                      <td className="p-3 text-gray-700">{user.department || 'N/A'}</td>
                      <td className="p-3">
                        <Badge variant={user.is_active ? "default" : "secondary"} className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-700">
                        {user.last_sign_in_at ? 
                          new Date(user.last_sign_in_at).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className="text-gray-700 border-gray-300 hover:bg-gray-100"
                          >
                            {user.is_active ? 
                              <Lock className="h-3 w-3" /> : 
                              <Unlock className="h-3 w-3" />
                            }
                          </Button>
                          <Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-100">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {currentView === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Audit Trail ({filteredAuditLogs.length} records)
            </CardTitle>
            <CardDescription>
              Complete history of all changes made to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-900">Timestamp</th>
                    <th className="text-left p-3 font-semibold text-gray-900">User</th>
                    <th className="text-left p-3 font-semibold text-gray-900">KPI</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Month</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Type</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No audit records found. Start making changes to see audit trail.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const kpiInfo = getKpiInfo(log.reason);
                      
                      return (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-xs text-gray-700 whitespace-nowrap">
                            {new Date(log.changed_at).toLocaleString()}
                          </td>
                          <td className="p-3 text-gray-900 font-medium">{log.user_name}</td>
                          <td className="p-3">
                            {kpiInfo ? (
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">{kpiInfo.kpi}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            {kpiInfo ? (
                              <Badge variant="outline" className="text-blue-800 border-blue-300 whitespace-nowrap">
                                {kpiInfo.month}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant="outline" 
                              className={
                                log.field === 'status_update' 
                                  ? 'text-purple-800 border-purple-300' 
                                  : log.field === 'value_update'
                                  ? 'text-emerald-800 border-emerald-300'
                                  : 'text-gray-800 border-gray-300'
                              }
                            >
                              {log.field === 'status_update' ? 'Status' : log.field === 'value_update' ? 'Value' : log.field}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="max-w-sm">
                              {formatChangeDescription(log)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Management */}
      {currentView === 'templates' && <TemplateManager />}

      {/* System Settings */}
      {currentView === 'system' && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Database Status</h4>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-green-800">Connected to Supabase</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">System Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{users.length}</div>
                    <div className="text-sm text-blue-700">Total Users</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">{auditLogs.length}</div>
                    <div className="text-sm text-purple-700">Audit Records</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Maintenance Actions</h4>
                <div className="flex space-x-4">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Audit Logs
                  </Button>
                  <Button variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    System Health Check
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
