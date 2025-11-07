'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { KpiValue, Kpi, KpiPeriod, Section, KpiStatus, KpiAttachment } from '@/lib/types/database';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Paperclip, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  PlayCircle,
  Save,
  X,
  Edit2,
  Upload,
  Eye,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  File,
  Plus
} from 'lucide-react';

interface GridData {
  kpi: Kpi;
  values: { [periodId: string]: KpiValue };
  section: Section;
}

interface AttachmentModalState {
  isOpen: boolean;
  kpiId: string | null;
  periodId: string | null;
  kpiName: string;
  periodName: string;
}

export function KpiGrid() {
  const { appUser, user } = useAuth();
  const { success, error } = useToast();
  const [gridData, setGridData] = useState<GridData[]>([]);
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [contractorName, setContractorName] = useState('Black Gold Integrated Solutions - PDO Nimr');
  const [pdoHolder, setPdoHolder] = useState('Al Salti Anwar, UPKC1');
  const [editingHeader, setEditingHeader] = useState<'contractor' | 'pdo' | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  
  // Filter states
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedKpi, setSelectedKpi] = useState<string>('all');
  
  // Attachment states
  const [attachmentModal, setAttachmentModal] = useState<AttachmentModalState>({
    isOpen: false,
    kpiId: null,
    periodId: null,
    kpiName: '',
    periodName: ''
  });
  const [attachments, setAttachments] = useState<KpiAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        console.log('Starting to load KPI data...');
      }
      
      // Fetch periods for 2025
      const { data: periodsData, error: periodsError } = await supabaseClient
        .from('kpi_period')
        .select('*')
        .eq('year', 2025)
        .eq('period_type', 'monthly')
        .order('month');

      if (periodsError) throw periodsError;
      setPeriods(periodsData || []);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabaseClient
        .from('section')
        .select('*')
        .order('order_idx');
        
      if (sectionsError) throw sectionsError;

      // Fetch KPIs
      const { data: kpisData, error: kpisError } = await supabaseClient
        .from('kpi')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (kpisError) throw kpisError;

      // Fetch KPI values with attachment counts
      const { data: valuesData, error: valuesError } = await supabaseClient
        .from('kpi_value')
        .select('*, attachment_count');

      if (valuesError) throw valuesError;

      // Organize data
      const organized = (kpisData || []).map(kpi => {
        const section = sectionsData?.find(s => s.section_id === kpi.section_id);
        
        const values: { [periodId: string]: KpiValue } = {};
        (valuesData || [])
          .filter(value => value.kpi_id === kpi.kpi_id)
          .forEach(value => {
            values[value.period_id] = value;
          });

        return {
          kpi,
          values,
          section: section || { 
            section_id: kpi.section_id, 
            name: 'Unknown Section', 
            code: 'UNK', 
            order_idx: 999,
            description: null,
            site_id: '',
            is_active: true,
            created_at: '',
            updated_at: ''
          }
        };
      });

      setGridData(organized);
      
      if (!isAutoRefresh) {
        console.log('KPI data loaded successfully');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      if (!isAutoRefresh) {
        error('Load Error', 'Failed to load KPI data. Retrying...');
        // Retry once after a short delay
        setTimeout(() => loadData(false), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    let mounted = true;
    let refreshInterval: NodeJS.Timeout;
    
    // Initial load
    loadData(false);
    
    // Set up periodic refresh every 30 seconds to keep connection alive
    // and detect any changes from other users
    refreshInterval = setInterval(() => {
      if (mounted) {
        loadData(true); // Silent refresh without notifications
      }
    }, 30000); // 30 seconds
    
    return () => {
      mounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadData]);

  const updateKpiValue = async (kpiId: string, periodId: string, newValue: string) => {
    const cellId = `${kpiId}-${periodId}`;
    
    try {
      setSavingCells(prev => new Set([...prev, cellId]));
      
      const existingValue = gridData
        .find(item => item.kpi.kpi_id === kpiId)?.values[periodId];

      let result;
      const numericValue = !isNaN(Number(newValue)) ? Number(newValue) : null;

      if (existingValue) {
        // Update existing
        result = await supabaseClient
          .from('kpi_value')
          .update({
            text_value: newValue,
            numeric_value: numericValue,
            updated_at: new Date().toISOString(),
            version: existingValue.version + 1
          })
          .eq('value_id', existingValue.value_id)
          .select();
      } else {
        // Create new
        result = await supabaseClient
          .from('kpi_value')
          .insert({
            kpi_id: kpiId,
            period_id: periodId,
            status: 'not_started' as KpiStatus,
            text_value: newValue,
            numeric_value: numericValue,
          })
          .select();
      }

      if (result.error) {
        error('Save Failed', `Could not save KPI update: ${result.error.message}`);
        return false;
      }

      // Log the change to audit trail
      if (user) {
        try {
          const kpiItem = gridData.find(item => item.kpi.kpi_id === kpiId);
          const period = periods.find(p => p.period_id === periodId);
          
          await supabaseClient
            .from('change_set')
            .insert({
              entity: 'kpi_value',
              entity_id: existingValue?.value_id || result.data?.[0]?.value_id,
              field: 'value_update',
              old_value: existingValue ? JSON.stringify({
                text: existingValue.text_value,
                numeric: existingValue.numeric_value
              }) : null,
              new_value: JSON.stringify({
                text: newValue,
                numeric: numericValue
              }),
              changed_by: user.id,
              reason: `KPI: ${kpiItem?.kpi.code} - ${kpiItem?.kpi.name} | Month: ${period?.label}`,
              source_page: '/kpi-grid'
            });
        } catch (auditError) {
          console.error('Error logging to audit trail:', auditError);
          // Don't fail the update if audit logging fails
        }
      }

      await loadData();
      
      const kpiItem = gridData.find(item => item.kpi.kpi_id === kpiId);
      const period = periods.find(p => p.period_id === periodId);
      
      success(
        'KPI Updated',
        `${kpiItem?.kpi.name || 'KPI'} updated for ${period?.label || 'period'}`
      );
      
      return true;
    } catch (err) {
      console.error('Error updating KPI value:', err);
      error('Update Error', `Failed to update KPI`);
      return false;
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    }
  };

  const updateKpiStatus = async (kpiId: string, periodId: string, newStatus: KpiStatus) => {
    const cellId = `${kpiId}-${periodId}`;
    
    try {
      setSavingCells(prev => new Set([...prev, cellId]));
      
      const existingValue = gridData
        .find(item => item.kpi.kpi_id === kpiId)?.values[periodId];

      let result;

      if (existingValue) {
        result = await supabaseClient
          .from('kpi_value')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
            version: existingValue.version + 1
          })
          .eq('value_id', existingValue.value_id)
          .select();
      } else {
        result = await supabaseClient
          .from('kpi_value')
          .insert({
            kpi_id: kpiId,
            period_id: periodId,
            status: newStatus,
          })
          .select();
      }

      if (result.error) {
        error('Save Failed', `Could not save status update: ${result.error.message}`);
        return false;
      }

      // Log the change to audit trail
      if (user) {
        try {
          const kpiItem = gridData.find(item => item.kpi.kpi_id === kpiId);
          const period = periods.find(p => p.period_id === periodId);
          
          await supabaseClient
            .from('change_set')
            .insert({
              entity: 'kpi_value',
              entity_id: existingValue?.value_id || result.data?.[0]?.value_id,
              field: 'status_update',
              old_value: existingValue?.status || 'not_started',
              new_value: newStatus,
              changed_by: user.id,
              reason: `KPI: ${kpiItem?.kpi.code} - ${kpiItem?.kpi.name} | Month: ${period?.label}`,
              source_page: '/kpi-grid'
            });
        } catch (auditError) {
          console.error('Error logging to audit trail:', auditError);
          // Don't fail the update if audit logging fails
        }
      }

      await loadData();
      success('Status Updated', 'KPI status has been updated successfully');
      
      return true;
    } catch (err) {
      console.error('Error updating KPI status:', err);
      error('Update Error', `Failed to update KPI status`);
      return false;
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: KpiStatus) => {
    const iconClass = "h-4 w-4";
    switch (status) {
      case 'done': return <CheckCircle2 className={`${iconClass} text-emerald-600`} />;
      case 'in_progress': return <Clock className={`${iconClass} text-amber-600`} />;
      case 'not_started': return <PlayCircle className={`${iconClass} text-slate-500`} />;
      case 'blocked': return <XCircle className={`${iconClass} text-red-600`} />;
      case 'needs_review': return <AlertCircle className={`${iconClass} text-blue-600`} />;
      default: return <PlayCircle className={`${iconClass} text-slate-500`} />;
    }
  };

  const getValueColorClass = (value: string | undefined) => {
    const baseClasses = "w-full text-center text-base font-bold px-3 py-2 focus:outline-none transition-all duration-300 border-2 rounded-lg";
    
    if (!value || value === '') {
      return `${baseClasses} bg-neutral-800 text-yellow-400 border-yellow-600 focus:border-yellow-500 placeholder:text-yellow-700`;
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue === '1' || trimmedValue.toLowerCase() === 'done') {
      return `${baseClasses} bg-emerald-900 text-emerald-300 border-emerald-500 focus:border-emerald-400`;
    } else if (trimmedValue === '0' || trimmedValue.toLowerCase().includes('progress')) {
      return `${baseClasses} bg-amber-900 text-amber-300 border-amber-500 focus:border-amber-400`;
    } else if (/^\d+$/.test(trimmedValue) && parseInt(trimmedValue) > 1) {
      return `${baseClasses} bg-neutral-700 text-yellow-300 border-yellow-500 focus:border-yellow-400`;
    } else {
      return `${baseClasses} bg-neutral-800 text-yellow-400 border-yellow-600 focus:border-yellow-500`;
    }
  };

  const isCellSaving = (kpiId: string, periodId: string) => {
    return savingCells.has(`${kpiId}-${periodId}`);
  };

  const handleHeaderEdit = (type: 'contractor' | 'pdo') => {
    setEditingHeader(type);
    setHeaderEditValue(type === 'contractor' ? contractorName : pdoHolder);
  };

  const handleHeaderSave = () => {
    if (editingHeader === 'contractor') {
      setContractorName(headerEditValue);
    } else if (editingHeader === 'pdo') {
      setPdoHolder(headerEditValue);
    }
    setEditingHeader(null);
    setHeaderEditValue('');
  };

  const handleHeaderCancel = () => {
    setEditingHeader(null);
    setHeaderEditValue('');
  };

  // Attachment functions
  const openAttachmentModal = async (kpiId: string, periodId: string) => {
    const kpiItem = gridData.find(item => item.kpi.kpi_id === kpiId);
    const period = periods.find(p => p.period_id === periodId);
    
    setAttachmentModal({
      isOpen: true,
      kpiId,
      periodId,
      kpiName: kpiItem?.kpi.name || 'KPI',
      periodName: period?.label || 'Month'
    });

    await loadAttachments(kpiId, periodId);
  };

  const loadAttachments = async (kpiId: string, periodId: string) => {
    try {
      const kpiValue = gridData.find(item => item.kpi.kpi_id === kpiId)?.values[periodId];
      if (!kpiValue) return;

      const { data, error } = await supabaseClient
        .from('kpi_attachment')
        .select(`
          *,
          uploader:uploaded_by(display_name, email)
        `)
        .eq('kpi_value_id', kpiValue.value_id)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error loading attachments:', err);
      error('Load Error', 'Failed to load attachments');
    }
  };

  const handleFileUpload = async (files: FileList | null, kpiId: string, periodId: string) => {
    if (!files || files.length === 0 || !appUser) return;

    let kpiValue = gridData.find(item => item.kpi.kpi_id === kpiId)?.values[periodId];
    
    if (!kpiValue) {
      const { data, error: createError } = await supabaseClient
        .from('kpi_value')
        .insert({
          kpi_id: kpiId,
          period_id: periodId,
          status: 'not_started'
        })
        .select()
        .single();

      if (createError) {
        error('Upload Error', 'Failed to create KPI value for attachment');
        return;
      }
      kpiValue = data;
    }

    if (!kpiValue) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadId = `${kpiValue.value_id}-${file.name}`;
      
      try {
        setUploadingFiles(prev => new Set([...prev, uploadId]));

        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `kpi-attachments/${kpiValue.value_id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabaseClient
          .from('kpi_attachment')
          .insert({
            kpi_value_id: kpiValue.value_id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: appUser.user_id
          });

        if (insertError) throw insertError;

        success('Upload Success', `${file.name} uploaded successfully`);
        
        await loadAttachments(kpiId, periodId);
        await loadData();
        
      } catch (err) {
        console.error('Error uploading file:', err);
        error('Upload Error', `Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(uploadId);
          return newSet;
        });
      }
    }
  };

  const downloadAttachment = async (attachment: KpiAttachment) => {
    try {
      const { data, error } = await supabaseClient.storage
        .from('attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      error('Download Error', 'Failed to download file');
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabaseClient
        .from('kpi_attachment')
        .update({ is_active: false })
        .eq('attachment_id', attachmentId);

      if (error) throw error;

      success('Delete Success', 'Attachment deleted successfully');
      
      if (attachmentModal.kpiId && attachmentModal.periodId) {
        await loadAttachments(attachmentModal.kpiId, attachmentModal.periodId);
        await loadData();
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
      error('Delete Error', 'Failed to delete attachment');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-purple-600" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-600" />;
    } else {
      return <File className="h-5 w-5 text-blue-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--primary)' }} />
          <div className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Loading HSE Monitoring Plan...</div>
        </div>
      </div>
    );
  }

  // Group by section
  const sectionsMap = new Map<string, GridData[]>();
  gridData.forEach(item => {
    const sectionId = item.section.section_id;
    if (!sectionsMap.has(sectionId)) {
      sectionsMap.set(sectionId, []);
    }
    sectionsMap.get(sectionId)!.push(item);
  });

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto" style={{ background: 'var(--background)' }}>
      <div style={{ minWidth: '1900px', width: 'max-content' }}>
        {/* Header */}
        <div className="border-b-4 p-6 shadow-xl" style={{ background: 'var(--card)', borderColor: 'var(--primary)' }}>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3 tracking-wide" style={{ color: 'var(--primary)' }}>2025 HSE Monitoring Plan</h1>
            
            {/* Contractor Name */}
            <div className="text-sm mt-2 flex items-center justify-center">
              <span className="mr-2 font-medium">Contractor Name:</span>
              {editingHeader === 'contractor' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={headerEditValue}
                    onChange={(e) => setHeaderEditValue(e.target.value)}
                    className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold min-w-96 shadow-lg border-2 border-blue-200"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleHeaderSave();
                      if (e.key === 'Escape') handleHeaderCancel();
                    }}
                  />
                  <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg" onClick={handleHeaderSave}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white shadow-lg" onClick={handleHeaderCancel}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className="cursor-pointer hover:bg-blue-600 px-4 py-2 rounded-lg transition-all duration-200 shadow-lg bg-blue-500/50 backdrop-blur-sm"
                  onClick={() => handleHeaderEdit('contractor')}
                  title="Click to edit contractor name"
                >
                  {contractorName}
                </span>
              )}
            </div>
            
            {/* PDO Contract Holder */}
            <div className="text-sm mt-2 flex items-center justify-center">
              <span className="mr-2 font-medium">PDO Contract Holder:</span>
              {editingHeader === 'pdo' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={headerEditValue}
                    onChange={(e) => setHeaderEditValue(e.target.value)}
                    className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold min-w-80 shadow-lg border-2 border-blue-200"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleHeaderSave();
                      if (e.key === 'Escape') handleHeaderCancel();
                    }}
                  />
                  <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg" onClick={handleHeaderSave}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white shadow-lg" onClick={handleHeaderCancel}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className="cursor-pointer hover:bg-blue-600 px-4 py-2 rounded-lg transition-all duration-200 shadow-lg bg-blue-500/50 backdrop-blur-sm"
                  onClick={() => handleHeaderEdit('pdo')}
                  title="Click to edit PDO contract holder"
                >
                  {pdoHolder}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="border-b-2 p-4 shadow-md" style={{ background: 'var(--card)', borderColor: 'var(--primary)' }}>
          <div className="flex items-center space-x-4 max-w-4xl">
            <div className="flex items-center space-x-2 flex-1">
              <label className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                Filter by Section:
              </label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Sections</SelectItem>
                  {Array.from(sectionsMap.entries()).map(([sectionId, items]) => (
                    <SelectItem 
                      key={sectionId} 
                      value={sectionId}
                    >
                      {items[0].section.order_idx}. {items[0].section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 flex-1">
              <label className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                Filter by KPI:
              </label>
              <Select value={selectedKpi} onValueChange={setSelectedKpi}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All KPIs" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-96">
                  <SelectItem value="all">All KPIs</SelectItem>
                  {gridData
                    .filter(item => selectedSection === 'all' || item.section.section_id === selectedSection)
                    .map(item => (
                      <SelectItem 
                        key={item.kpi.kpi_id} 
                        value={item.kpi.kpi_id}
                      >
                        {item.kpi.code}: {item.kpi.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedSection !== 'all' || selectedKpi !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSection('all');
                  setSelectedKpi('all');
                }}
                className="whitespace-nowrap"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Table Header */}
        <div className="sticky top-0 border-b-2 z-50 shadow-2xl overflow-visible" style={{ background: 'var(--card)', borderColor: 'var(--primary)' }}>
          <div className="grid grid-cols-[60px_450px_repeat(12,_110px)] gap-3 p-4 font-bold text-sm overflow-visible" style={{ minWidth: '1900px', width: '100%', color: 'var(--primary)' }}>
            <div className="text-center font-bold">#</div>
            <div className="font-bold">HSE Actions & Requirements</div>
            
            {/* January */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Jan-25</span>
              </div>
            </div>
            
            {/* February */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Feb-25</span>
              </div>
            </div>
            
            {/* March */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Mar-25</span>
              </div>
            </div>
            
            {/* April */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Apr-25</span>
              </div>
            </div>
            
            {/* May */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">May-25</span>
              </div>
            </div>
            
            {/* June */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Jun-25</span>
              </div>
            </div>
            
            {/* July */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Jul-25</span>
              </div>
            </div>
            
            {/* August */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Aug-25</span>
              </div>
            </div>
            
            {/* September */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Sep-25</span>
              </div>
            </div>
            
            {/* October */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Oct-25</span>
              </div>
            </div>
            
            {/* November */}
            <div className="text-center font-bold whitespace-nowrap px-1">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">Nov-25</span>
              </div>
            </div>
            
            {/* December - Specially treated */}
            <div className="text-center font-bold whitespace-nowrap px-1 bg-slate-700 rounded shadow-lg border border-slate-600">
              <div className="flex items-center justify-center space-x-1">
                <Calendar className="h-3 w-3 flex-shrink-0 text-white" />
                <span className="text-xs font-black text-white">Dec-25</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sections and KPIs */}
        {Array.from(sectionsMap.entries())
          .filter(([sectionId]) => selectedSection === 'all' || sectionId === selectedSection)
          .map(([sectionId, items]) => {
          const section = items[0].section;
          
          // Filter items by selected KPI if applicable
          const filteredItems = selectedKpi === 'all' 
            ? items 
            : items.filter(item => item.kpi.kpi_id === selectedKpi);
          
          // Skip section if no items match the filter
          if (filteredItems.length === 0) return null;
          
          return (
            <div key={sectionId} className="border-b shadow-sm">
              {/* Section Header */}
              <div className="p-4 font-bold text-lg border-b-2 shadow-md" style={{ background: 'var(--card)', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                <div className="flex items-center space-x-3">
                  <span className="bg-yellow-600 text-black px-3 py-1 rounded-full text-sm font-bold">
                    {section.order_idx}
                  </span>
                  <span>{section.name}</span>
                </div>
              </div>

              {/* KPIs in section */}
              {filteredItems.map((item, index) => (
                <div
                  key={item.kpi.kpi_id}
                  className="grid grid-cols-[60px_450px_repeat(12,_110px)] gap-3 p-4 border-b text-sm min-w-[1900px] transition-all duration-200"
                  style={{ 
                    background: 'var(--background)', 
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="text-center font-bold text-black bg-yellow-500 rounded-lg p-2 flex items-center justify-center shadow-sm border-2 border-yellow-600">
                    {section.order_idx}.{index + 1}
                  </div>
                  
                  <div className="pr-2">
                    <div className="font-bold leading-tight text-sm mb-2 p-3 rounded-lg shadow-sm border-2" style={{ color: 'var(--foreground)', background: 'var(--muted)', borderColor: 'var(--primary)' }}>
                      {item.kpi.name}
                    </div>
                    {item.kpi.description && (
                      <div className="text-xs mt-1 p-2 rounded border-l-4" style={{ color: 'var(--muted-foreground)', background: 'var(--muted)', borderColor: 'var(--primary)' }}>
                        {item.kpi.description.substring(0, 120)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Monthly values */}
                  {periods.map(period => {
                    const value = item.values[period.period_id];
                    const cellId = `${item.kpi.kpi_id}-${period.period_id}`;
                    const attachmentCount = value?.attachment_count || 0;
                    
                    return (
                      <div key={period.period_id} className="space-y-2">
                        {/* Value input */}
                        <div className="relative">
                          <input
                            type="text"
                            defaultValue={value?.text_value || value?.numeric_value?.toString() || ''}
                            className={`${getValueColorClass(value?.text_value || value?.numeric_value?.toString())} ${
                              isCellSaving(item.kpi.kpi_id, period.period_id) 
                                ? 'opacity-70 cursor-wait' 
                                : ''
                            }`}
                            placeholder="0"
                            disabled={isCellSaving(item.kpi.kpi_id, period.period_id)}
                            onBlur={(e) => {
                              const newValue = e.target.value;
                              const currentValue = value?.text_value || value?.numeric_value?.toString() || '';
                              if (newValue !== currentValue) {
                                updateKpiValue(item.kpi.kpi_id, period.period_id, newValue);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newValue = (e.target as HTMLInputElement).value;
                                const currentValue = value?.text_value || value?.numeric_value?.toString() || '';
                                if (newValue !== currentValue) {
                                  updateKpiValue(item.kpi.kpi_id, period.period_id, newValue);
                                }
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                          {isCellSaving(item.kpi.kpi_id, period.period_id) && (
                            <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600" />
                          )}
                        </div>

                        {/* Status and actions */}
                        <div className="flex items-center justify-between space-x-1">
                          <Select
                            value={value?.status || 'not_started'}
                            onValueChange={(newStatus: KpiStatus) => updateKpiStatus(item.kpi.kpi_id, period.period_id, newStatus)}
                          >
                            <SelectTrigger className="h-7 text-xs px-2 border-0 bg-transparent shadow-none">
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(value?.status || 'not_started')}
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-2 border-slate-300 shadow-2xl z-50 backdrop-blur-sm">
                              <SelectItem value="not_started" className="bg-white hover:bg-slate-100 text-slate-900">Not Started</SelectItem>
                              <SelectItem value="in_progress" className="bg-white hover:bg-amber-100 text-slate-900">In Progress</SelectItem>
                              <SelectItem value="done" className="bg-white hover:bg-emerald-100 text-slate-900">Done</SelectItem>
                              <SelectItem value="blocked" className="bg-white hover:bg-red-100 text-slate-900">Blocked</SelectItem>
                              <SelectItem value="needs_review" className="bg-white hover:bg-blue-100 text-slate-900">Needs Review</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Attachment indicator */}
                          {attachmentCount > 0 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {attachmentCount}
                            </Badge>
                          )}
                        </div>

                        {/* Upload button */}
                        <div className="flex items-center justify-center mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 hover:text-blue-800"
                            onClick={() => openAttachmentModal(item.kpi.kpi_id, period.period_id)}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Files
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Attachment Modal */}
      {attachmentModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border-2 border-yellow-600">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-black via-neutral-900 to-black text-yellow-500 p-6 border-b-2 border-yellow-600">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">Attachments</h3>
                  <p className="text-sm text-blue-100 mt-1">
                    {attachmentModal.kpiName} - {attachmentModal.periodName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white hover:text-blue-600"
                  onClick={() => setAttachmentModal({ isOpen: false, kpiId: null, periodId: null, kpiName: '', periodName: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 mb-6 bg-gradient-to-br transition-all duration-300 cursor-pointer ${
                  dragOver 
                    ? 'border-blue-500 from-blue-50 to-blue-100 bg-blue-50/50' 
                    : 'border-slate-300 from-slate-50 to-white hover:border-blue-400 hover:from-blue-50 hover:to-blue-100'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (attachmentModal.kpiId && attachmentModal.periodId) {
                    handleFileUpload(e.dataTransfer.files, attachmentModal.kpiId, attachmentModal.periodId);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 transition-colors duration-300 ${
                    dragOver ? 'bg-blue-200' : 'bg-blue-100'
                  }`}>
                    <Upload className={`h-6 w-6 transition-colors duration-300 ${
                      dragOver ? 'text-blue-700' : 'text-blue-600'
                    }`} />
                  </div>
                  <h4 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                    dragOver ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {dragOver ? 'Drop files here' : 'Upload Files'}
                  </h4>
                  <p className={`text-sm mb-4 transition-colors duration-300 ${
                    dragOver ? 'text-blue-700' : 'text-slate-600'
                  }`}>
                    {dragOver ? 'Release to upload' : 'Drag and drop files here, or click to select files'}
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (attachmentModal.kpiId && attachmentModal.periodId) {
                        handleFileUpload(e.target.files, attachmentModal.kpiId, attachmentModal.periodId);
                      }
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  />
                  
                  {!dragOver && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  )}
                </div>
              </div>

              {/* Uploaded Files */}
              {attachments.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attached Files ({attachments.length})
                  </h4>
                  
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.attachment_id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getFileIcon(attachment.file_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {attachment.file_name}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <span>{formatFileSize(attachment.file_size)}</span>
                              <span>•</span>
                              <span>
                                {new Date(attachment.uploaded_at).toLocaleDateString()}
                              </span>
                              {attachment.uploader && (
                                <>
                                  <span>•</span>
                                  <span>{attachment.uploader.display_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAttachment(attachment)}
                            className="h-8 w-8 p-0"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAttachment(attachment.attachment_id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-4">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No files attached yet</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploadingFiles.size > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">
                      Uploading {uploadingFiles.size} file{uploadingFiles.size === 1 ? '' : 's'}...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setAttachmentModal({ isOpen: false, kpiId: null, periodId: null, kpiName: '', periodName: '' })}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
