'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { 
  FileText, 
  Upload, 
  Download, 
  Edit, 
  Trash2, 
  Eye,
  Plus,
  RefreshCw,
  Calendar,
  User,
  Search,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface ExportTemplate {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  created_at: string;
  version: number;
  is_active: boolean;
  checksum: string | null;
  created_by: string;
  creator_name: string;
}

interface ExportRun {
  id: string;
  template_id: string;
  requested_by: string;
  started_at: string;
  finished_at: string | null;
  file_url: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  template_name: string;
  requester_name: string;
}

export function TemplateManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [exportRuns, setExportRuns] = useState<ExportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'exports'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'templates') {
        await loadTemplates();
      } else {
        await loadExportRuns();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('export_template')
      .select(`
        *,
        app_user!created_by (
          display_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const templatesWithNames = data.map(template => ({
        ...template,
        creator_name: (template.app_user as any)?.display_name || (template.app_user as any)?.email || 'Unknown'
      }));
      setTemplates(templatesWithNames);
    }
  };

  const loadExportRuns = async () => {
    const { data, error } = await supabase
      .from('export_run')
      .select(`
        *,
        export_template!template_id (
          name
        ),
        app_user!requested_by (
          display_name,
          email
        )
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const runsWithNames = data.map(run => ({
        ...run,
        template_name: (run.export_template as any)?.name || 'Unknown Template',
        requester_name: (run.app_user as any)?.display_name || (run.app_user as any)?.email || 'Unknown'
      }));
      setExportRuns(runsWithNames);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (Excel files only)
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace(/\.(xlsx|xls)$/, ''));
      }
    }
  };

  const uploadTemplate = async () => {
    if (!selectedFile || !templateName.trim() || !user) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `template_${Date.now()}.${fileExtension}`;
      const filePath = `templates/${fileName}`;

      // Calculate version number
      const existingVersions = templates.filter(t => t.name === templateName.trim());
      const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map(t => t.version)) + 1 : 1;

      // For now, we'll just store metadata (in production, upload to storage)
      const { data, error } = await supabase
        .from('export_template')
        .insert({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          file_path: filePath,
          version: nextVersion,
          is_active: true,
          created_by: user.id,
          checksum: `${selectedFile.size}_${selectedFile.lastModified}` // Simple checksum
        })
        .select()
        .single();

      if (error) throw error;

      // Deactivate previous versions if this is an update
      if (existingVersions.length > 0) {
        await supabase
          .from('export_template')
          .update({ is_active: false })
          .neq('id', data.id)
          .eq('name', templateName.trim());
      }

      // Log the upload
      await supabase
        .from('change_set')
        .insert({
          entity: 'export_template',
          entity_id: data.id,
          field: 'template_upload',
          new_value: templateName.trim(),
          changed_by: user.id,
          reason: 'Template uploaded',
          source_page: '/templates'
        });

      setSelectedFile(null);
      setTemplateName('');
      setTemplateDescription('');
      loadTemplates();
      alert('Template uploaded successfully!');
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('export_template')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);

      if (!error) {
        loadTemplates();
        
        // Log the action
        await supabase
          .from('change_set')
          .insert({
            entity: 'export_template',
            entity_id: templateId,
            field: 'is_active',
            old_value: currentStatus.toString(),
            new_value: (!currentStatus).toString(),
            changed_by: user?.id,
            reason: 'Template status changed',
            source_page: '/templates'
          });
      }
    } catch (error) {
      console.error('Error updating template status:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('export_template')
        .delete()
        .eq('id', templateId);

      if (!error) {
        loadTemplates();
        
        // Log the deletion
        await supabase
          .from('change_set')
          .insert({
            entity: 'export_template',
            entity_id: templateId,
            field: 'template_delete',
            new_value: 'deleted',
            changed_by: user?.id,
            reason: 'Template deleted',
            source_page: '/templates'
          });
        
        alert('Template deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const;
    
    const icons = {
      pending: <RefreshCw className="h-3 w-3 mr-1" />,
      running: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <XCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExportRuns = exportRuns.filter(run =>
    run.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.requester_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Template Management</h2>
          <p className="text-sm text-gray-600">
            Manage Excel export templates and view export history
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('templates')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant={activeTab === 'exports' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('exports')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'templates' ? "Search templates..." : "Search export history..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Upload New Template
              </CardTitle>
              <CardDescription>
                Upload Excel templates for HSE monitoring plan exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template File</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".xlsx,.xls"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Template description"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                onClick={uploadTemplate}
                disabled={!selectedFile || !templateName.trim() || uploading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Template'}
              </Button>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <FileText className="h-8 w-8 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">
                              {template.name}
                            </h4>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {template.creator_name}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(template.created_at).toLocaleDateString()}
                              </div>
                              <span>Version {template.version}</span>
                              <Badge variant={template.is_active ? "default" : "secondary"}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Export History Tab */}
      {activeTab === 'exports' && (
        <Card>
          <CardHeader>
            <CardTitle>Export History ({filteredExportRuns.length})</CardTitle>
            <CardDescription>
              History of all template-based exports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading export history...</div>
            ) : filteredExportRuns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No export history found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Template</th>
                      <th className="text-left p-3">Requested By</th>
                      <th className="text-left p-3">Started</th>
                      <th className="text-left p-3">Duration</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExportRuns.map((run) => (
                      <tr key={run.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{run.template_name}</td>
                        <td className="p-3">{run.requester_name}</td>
                        <td className="p-3">{new Date(run.started_at).toLocaleString()}</td>
                        <td className="p-3">
                          {run.finished_at ? (
                            `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                          ) : (
                            'Running...'
                          )}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(run.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            {run.status === 'completed' && run.file_url && (
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
