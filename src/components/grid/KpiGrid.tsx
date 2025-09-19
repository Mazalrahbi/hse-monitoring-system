'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { KpiValue, Kpi, KpiPeriod, Section, KpiStatus } from '@/lib/types/database';
import { useAuth } from '@/components/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Eye, Edit2, Save, X } from 'lucide-react';

interface GridData {
  kpi: Kpi;
  values: { [periodId: string]: KpiValue };
  section: Section;
}

export function KpiGrid() {
  const { appUser } = useAuth();
  const [gridData, setGridData] = useState<GridData[]>([]);
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [contractorName, setContractorName] = useState('Black Gold Integrated Solution PDO Nimr');
  const [pdoHolder, setPdoHolder] = useState('Al Salti Anwar, UPKC1');
  const [editingHeader, setEditingHeader] = useState<'contractor' | 'pdo' | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    try {
      console.log('Starting to load data...');
      
      // Test basic connection first
      const { data: testData, error: testError } = await supabaseClient
        .from('org_site')
        .select('*')
        .limit(1);
      
      console.log('Test connection result:', { testData, testError });
      
      if (testError) {
        console.error('Database connection failed:', testError);
        return;
      }

      // Fetch periods for 2025
      console.log('Fetching periods...');
      const { data: periodsData, error: periodsError } = await supabaseClient
        .from('kpi_period')
        .select('*')
        .eq('year', 2025)
        .eq('period_type', 'monthly')
        .order('start_date');

      console.log('Periods result:', { periodsData, periodsError });
      
      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
        throw periodsError;
      }
      setPeriods(periodsData || []);

      // Fetch sections first
      console.log('Fetching sections...');
      const { data: sectionsData, error: sectionsError } = await supabaseClient
        .from('section')
        .select('*')
        .order('order_idx');
        
      console.log('Sections result:', { sectionsData, sectionsError });
      
      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        throw sectionsError;
      }

      // Fetch KPIs
      console.log('Fetching KPIs...');
      const { data: kpisData, error: kpisError } = await supabaseClient
        .from('kpi')
        .select('*')
        .eq('is_active', true)
        .order('code');

      console.log('KPIs result:', { kpisData, kpisError });
      
      if (kpisError) {
        console.error('Error fetching KPIs:', kpisError);
        throw kpisError;
      }

      // Fetch KPI values
      console.log('Fetching KPI values...');
      const { data: valuesData, error: valuesError } = await supabaseClient
        .from('kpi_value')
        .select('*');

      console.log('Values result:', { valuesData, valuesError });
      
      if (valuesError) {
        console.error('Error fetching KPI values:', valuesError);
        throw valuesError;
      }

      // Organize data
      const organized = (kpisData || []).map(kpi => {
        // Find section for this KPI
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
          section: section || { section_id: kpi.section_id, name: 'Unknown Section', code: 'UNK', order_idx: 999 }
        };
      });

      console.log('Organized data:', organized);
      setGridData(organized);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateKpiValue = async (kpiId: string, periodId: string, newStatus: KpiStatus, newValue?: string) => {
    try {
      console.log('Updating KPI value:', { kpiId, periodId, newStatus, newValue });
      
      const existingValue = gridData
        .find(item => item.kpi.kpi_id === kpiId)?.values[periodId];

      // Get KPI and Period info for audit logging
      const kpiItem = gridData.find(item => item.kpi.kpi_id === kpiId);
      const period = periods.find(p => p.period_id === periodId);
      
      let result;
      let auditEntityId = existingValue?.value_id;

      if (existingValue) {
        // Update existing
        console.log('Updating existing value:', existingValue.value_id);
        
        // Log the change BEFORE making it
        if (appUser) {
          const oldValues = {
            status: existingValue.status,
            text_value: existingValue.text_value,
            numeric_value: existingValue.numeric_value
          };
          
          const newValues = {
            status: newStatus,
            text_value: newValue || existingValue.text_value,
            numeric_value: newValue && !isNaN(Number(newValue)) ? Number(newValue) : existingValue.numeric_value
          };

          await supabaseClient
            .from('change_set')
            .insert({
              entity: 'kpi_value',
              entity_id: existingValue.value_id,
              field: 'kpi_update',
              old_value: JSON.stringify(oldValues),
              new_value: JSON.stringify(newValues),
              changed_by: appUser.user_id,
              reason: `Updated KPI "${kpiItem?.kpi.name}" for period "${period?.label}"`,
              source_page: '/grid'
            });
        }

        result = await supabaseClient
          .from('kpi_value')
          .update({
            status: newStatus,
            text_value: newValue || existingValue.text_value,
            numeric_value: newValue && !isNaN(Number(newValue)) ? Number(newValue) : existingValue.numeric_value,
            updated_at: new Date().toISOString(),
            version: existingValue.version + 1
          })
          .eq('value_id', existingValue.value_id)
          .select();
      } else {
        // Create new
        console.log('Creating new value');
        result = await supabaseClient
          .from('kpi_value')
          .insert({
            kpi_id: kpiId,
            period_id: periodId,
            status: newStatus,
            text_value: newValue,
            numeric_value: newValue && !isNaN(Number(newValue)) ? Number(newValue) : null,
          })
          .select();

        // Log the creation
        if (result.data && result.data[0] && appUser) {
          auditEntityId = result.data[0].value_id;
          
          await supabaseClient
            .from('change_set')
            .insert({
              entity: 'kpi_value',
              entity_id: result.data[0].value_id,
              field: 'kpi_create',
              old_value: null,
              new_value: JSON.stringify({
                status: newStatus,
                text_value: newValue,
                numeric_value: newValue && !isNaN(Number(newValue)) ? Number(newValue) : null,
                kpi_name: kpiItem?.kpi.name,
                period_label: period?.label
              }),
              changed_by: appUser.user_id,
              reason: `Created new KPI value for "${kpiItem?.kpi.name}" in period "${period?.label}"`,
              source_page: '/grid'
            });
        }
      }

      console.log('Database result:', result);

      if (result.error) {
        console.error('Database error:', result.error);
        alert(`Failed to save: ${result.error.message}`);
        return false;
      }

      // Reload data
      await loadData();
      alert('Saved successfully!');
      return true;
    } catch (error) {
      console.error('Error updating KPI value:', error);
      alert(`Error: ${error}`);
      return false;
    }
  };

  const getStatusColor = (status: KpiStatus) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'needs_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCellEdit = (kpiId: string, periodId: string, currentValue: string) => {
    setEditingCell(`${kpiId}-${periodId}`);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (kpiId: string, periodId: string, currentStatus: KpiStatus) => {
    const success = await updateKpiValue(kpiId, periodId, currentStatus, editValue);
    if (success) {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleQuickSave = async (kpiId: string, periodId: string, value: string, status: KpiStatus) => {
    const success = await updateKpiValue(kpiId, periodId, status, value);
    return success;
  };

  const handleHeaderEdit = (type: 'contractor' | 'pdo') => {
    setEditingHeader(type);
    setHeaderEditValue(type === 'contractor' ? contractorName : pdoHolder);
  };

  const handleHeaderSave = () => {
    if (editingHeader === 'contractor') {
      setContractorName(headerEditValue);
      // You could also save to database here if needed
    } else if (editingHeader === 'pdo') {
      setPdoHolder(headerEditValue);
      // You could also save to database here if needed
    }
    setEditingHeader(null);
    setHeaderEditValue('');
  };

  const handleHeaderCancel = () => {
    setEditingHeader(null);
    setHeaderEditValue('');
  };

  const getValueColorClass = (value: string | undefined) => {
    if (!value || value === '') return 'bg-white text-slate-900 border-slate-400';
    
    const trimmedValue = value.trim();
    if (trimmedValue === '1') {
      return 'bg-green-100 text-green-900 border-green-500';
    } else if (trimmedValue === '0') {
      return 'bg-orange-100 text-orange-900 border-orange-500';
    } else if (/^\d+$/.test(trimmedValue)) {
      return 'bg-red-100 text-red-900 border-red-500';
    } else {
      return 'bg-white text-slate-900 border-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-900">Loading HSE Monitoring Plan...</div>
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
    <div className="w-full overflow-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 text-center">
          <h1 className="text-2xl font-bold">2025 HSE Monitoring Plan</h1>
          
          {/* Contractor Name */}
          <div className="text-sm mt-2 flex items-center justify-center">
            <span className="mr-2">Contractor Name:</span>
            {editingHeader === 'contractor' ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={headerEditValue}
                  onChange={(e) => setHeaderEditValue(e.target.value)}
                  className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold min-w-80"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleHeaderSave();
                    if (e.key === 'Escape') handleHeaderCancel();
                  }}
                />
                <Button
                  size="sm"
                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleHeaderSave}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleHeaderCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:bg-blue-500 px-3 py-1 rounded transition-colors"
                onClick={() => handleHeaderEdit('contractor')}
                title="Click to edit contractor name"
              >
                {contractorName}
              </span>
            )}
          </div>
          
          {/* PDO Contract Holder */}
          <div className="text-sm mt-1 flex items-center justify-center">
            <span className="mr-2">PDO Contract Holder:</span>
            {editingHeader === 'pdo' ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={headerEditValue}
                  onChange={(e) => setHeaderEditValue(e.target.value)}
                  className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold min-w-60"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleHeaderSave();
                    if (e.key === 'Escape') handleHeaderCancel();
                  }}
                />
                <Button
                  size="sm"
                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleHeaderSave}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleHeaderCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:bg-blue-500 px-3 py-1 rounded transition-colors"
                onClick={() => handleHeaderEdit('pdo')}
                title="Click to edit PDO contract holder"
              >
                {pdoHolder}
              </span>
            )}
          </div>
        </div>

        {/* Table Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-900 z-10">
          <div className="grid grid-cols-[50px_400px_repeat(12,_100px)] gap-2 p-3 font-semibold text-sm text-white">
            <div className="text-center">#</div>
            <div className="font-semibold">HSE Actions & Requirements</div>
            {periods.slice(0, 12).map(period => (
              <div key={period.period_id} className="text-center text-xs font-semibold">
                {period.label}
              </div>
            ))}
          </div>
        </div>

        {/* Sections and KPIs */}
        {Array.from(sectionsMap.entries()).map(([sectionId, items]) => {
          const section = items[0].section;
          return (
            <div key={sectionId} className="border-b">
              {/* Section Header */}
              <div className="bg-slate-700 p-3 font-semibold text-white text-base border-b border-slate-600">
                {section.order_idx}. {section.name}
              </div>

              {/* KPIs in section */}
              {items.map((item, index) => (
                <div
                  key={item.kpi.kpi_id}
                  className="grid grid-cols-[50px_400px_repeat(12,_100px)] gap-2 p-3 border-b border-slate-200 hover:bg-slate-50 text-sm bg-white"
                >
                  <div className="text-center font-semibold text-sm text-slate-700">
                    {section.order_idx}.{index + 1}
                  </div>
                  
                  <div className="pr-2">
                    <div className="font-semibold text-slate-900 leading-tight text-sm">
                      {item.kpi.name}
                    </div>
                    {item.kpi.description && (
                      <div className="text-xs text-slate-700 mt-1">
                        {item.kpi.description.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Monthly values - modern design */}
                  {periods.slice(0, 12).map(period => {
                    const value = item.values[period.period_id];
                    
                    return (
                      <div key={period.period_id} className="space-y-2">
                        {/* Value input with color coding */}
                        <input
                          type="text"
                          defaultValue={value?.text_value || value?.numeric_value?.toString() || ''}
                          className={`w-full text-center text-base font-bold border-2 rounded px-2 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${getValueColorClass(value?.text_value || value?.numeric_value?.toString())}`}
                          placeholder="0"
                          onBlur={(e) => {
                            const newValue = e.target.value;
                            if (newValue !== (value?.text_value || value?.numeric_value?.toString() || '')) {
                              handleQuickSave(item.kpi.kpi_id, period.period_id, newValue, value?.status || 'not_started');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        
                        {/* Modern status dropdown */}
                        <Select
                          value={value?.status || 'not_started'}
                          onValueChange={(newStatus: KpiStatus) => {
                            const currentValue = value?.text_value || value?.numeric_value?.toString() || '';
                            handleQuickSave(item.kpi.kpi_id, period.period_id, currentValue, newStatus);
                          }}
                        >
                          <SelectTrigger className="w-full h-10 text-sm font-semibold border-2 border-slate-400 bg-white text-slate-900 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-2 border-slate-300 shadow-lg min-w-32">
                            <SelectItem value="not_started" className="text-sm font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer py-2">
                              Not Started
                            </SelectItem>
                            <SelectItem value="in_progress" className="text-sm font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer py-2">
                              In Progress
                            </SelectItem>
                            <SelectItem value="done" className="text-sm font-semibold text-green-800 hover:bg-green-50 cursor-pointer py-2">
                              Done
                            </SelectItem>
                            <SelectItem value="blocked" className="text-sm font-semibold text-red-800 hover:bg-red-50 cursor-pointer py-2">
                              Blocked
                            </SelectItem>
                            <SelectItem value="needs_review" className="text-sm font-semibold text-blue-800 hover:bg-blue-50 cursor-pointer py-2">
                              Needs Review
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
