'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { 
  Upload, 
  File, 
  Image, 
  Download, 
  Trash2, 
  Eye,
  FileText,
  Calendar,
  User,
  Search,
  Filter,
  Plus,
  X
} from 'lucide-react';

interface Evidence {
  id: string;
  kpi_value_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  description: string | null;
  is_active: boolean;
  uploader_name: string;
  kpi_name: string;
  kpi_code: string;
}

interface EvidenceManagerProps {
  kpiValueId?: string;
  kpiName?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export function EvidenceManager({ kpiValueId, kpiName, isModal = false, onClose }: EvidenceManagerProps) {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents'>('all');

  useEffect(() => {
    loadEvidence();
  }, [kpiValueId]);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('evidence_attachment')
        .select(`
          *,
          app_user!uploaded_by (
            display_name,
            email
          ),
          kpi_value!kpi_value_id (
            kpi (
              name,
              code
            )
          )
        `)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (kpiValueId) {
        query = query.eq('kpi_value_id', kpiValueId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const evidenceWithNames = data.map(item => ({
          ...item,
          uploader_name: (item.app_user as any)?.display_name || (item.app_user as any)?.email || 'Unknown',
          kpi_name: (item.kpi_value as any)?.kpi?.name || 'Unknown KPI',
          kpi_code: (item.kpi_value as any)?.kpi?.code || 'N/A'
        }));
        setEvidence(evidenceWithNames);
      }
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadEvidence = async () => {
    if (!selectedFile || !kpiValueId || !user) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `evidence_${Date.now()}.${fileExtension}`;
      const filePath = `evidence/${kpiValueId}/${fileName}`;

      // Upload to Supabase Storage (if configured)
      // For now, we'll just store metadata
      const { error } = await supabase
        .from('evidence_attachment')
        .insert({
          kpi_value_id: kpiValueId,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by: user.id,
          description: description.trim() || null
        });

      if (error) throw error;

      // Log the upload
      await supabase
        .from('change_set')
        .insert({
          entity: 'evidence_attachment',
          entity_id: kpiValueId,
          field: 'file_upload',
          new_value: selectedFile.name,
          changed_by: user.id,
          reason: 'Evidence file uploaded',
          source_page: '/evidence'
        });

      setSelectedFile(null);
      setDescription('');
      loadEvidence();
      alert('Evidence uploaded successfully!');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      const { error } = await supabase
        .from('evidence_attachment')
        .update({ is_active: false })
        .eq('id', evidenceId);

      if (error) throw error;

      // Log the deletion
      await supabase
        .from('change_set')
        .insert({
          entity: 'evidence_attachment',
          entity_id: evidenceId,
          field: 'file_delete',
          new_value: 'deleted',
          changed_by: user?.id,
          reason: 'Evidence file deleted',
          source_page: '/evidence'
        });

      loadEvidence();
      alert('Evidence deleted successfully!');
    } catch (error) {
      console.error('Error deleting evidence:', error);
      alert('Failed to delete evidence');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredEvidence = evidence.filter(item => {
    const matchesSearch = item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.kpi_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === 'images') {
      matchesFilter = item.mime_type.startsWith('image/');
    } else if (filterType === 'documents') {
      matchesFilter = !item.mime_type.startsWith('image/');
    }

    return matchesSearch && matchesFilter;
  });

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {kpiName ? `Evidence for ${kpiName}` : 'Evidence Management'}
          </h2>
          <p className="text-sm text-gray-600">
            Upload and manage supporting evidence files
          </p>
        </div>
        {isModal && onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload Section */}
      {kpiValueId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Evidence
            </CardTitle>
            <CardDescription>
              Upload files to support this KPI (Max 10MB per file)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {selectedFile && (
                <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                  <div className="flex items-center">
                    {getFileIcon(selectedFile.type)}
                    <span className="ml-2 text-sm">{selectedFile.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({formatFileSize(selectedFile.size)})
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

            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this evidence..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <Button
              onClick={uploadEvidence}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search evidence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Files</option>
              <option value="images">Images</option>
              <option value="documents">Documents</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Evidence List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Evidence Files ({filteredEvidence.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading evidence...</div>
          ) : filteredEvidence.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No evidence files found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvidence.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(item.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {item.file_name}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {item.uploader_name}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(item.uploaded_at).toLocaleDateString()}
                          </div>
                          <span>{formatFileSize(item.file_size)}</span>
                          {!kpiValueId && (
                            <Badge variant="outline">
                              {item.kpi_code}
                            </Badge>
                          )}
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
                      {user?.id === item.uploaded_by && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteEvidence(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
}
