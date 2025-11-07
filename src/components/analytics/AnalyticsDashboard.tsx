'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Filter,
  Award,
  AlertCircle
} from 'lucide-react';

interface AnalyticsData {
  totalKpis: number;
  completionPercentage: number;
  inProgressPercentage: number;
  notStartedPercentage: number;
  blockedPercentage: number;
  sectionStats: Array<{
    sectionName: string;
    completionPercentage: number;
    total: number;
    completed: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  periodComparison: Array<{
    month: string;
    completionPercentage: number;
  }>;
  topPerformers: Array<{
    section: string;
    percentage: number;
  }>;
  needsAttention: Array<{
    section: string;
    percentage: number;
  }>;
}

const STATUS_COLORS = {
  done: '#10B981',
  in_progress: '#3B82F6', 
  not_started: '#9CA3AF',
  blocked: '#EF4444',
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalKpis: 0,
    completionPercentage: 0,
    inProgressPercentage: 0,
    notStartedPercentage: 0,
    blockedPercentage: 0,
    sectionStats: [],
    periodComparison: [],
    topPerformers: [],
    needsAttention: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [periods, setPeriods] = useState<Array<{id: string, label: string, period_id: string}>>([]);
  const [sections, setSections] = useState<Array<{id: string, name: string}>>([]);
  const [gridData, setGridData] = useState<any[]>([]);

  const loadFilters = useCallback(async () => {
    try {
      // Load periods for 2025
      const { data: periodsData } = await supabaseClient
        .from('kpi_period')
        .select('period_id, label')
        .eq('year', 2025)
        .eq('period_type', 'monthly')
        .order('month');
      
      if (periodsData) {
        setPeriods(periodsData.map(p => ({ id: p.period_id, label: p.label, period_id: p.period_id })));
      }

      // Load sections
      const { data: sectionsData } = await supabaseClient
        .from('section')
        .select('section_id, name, order_idx')
        .order('order_idx');
      
      if (sectionsData) {
        setSections(sectionsData.map(s => ({ id: s.section_id, name: s.name })));
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch data using the EXACT same structure as KPI Grid
      // Fetch periods for 2025
      const { data: periodsData, error: periodsError } = await supabaseClient
        .from('kpi_period')
        .select('*')
        .eq('year', 2025)
        .eq('period_type', 'monthly')
        .order('month');

      if (periodsError) throw periodsError;

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

      // Fetch KPI values
      const { data: valuesData, error: valuesError } = await supabaseClient
        .from('kpi_value')
        .select('*');

      if (valuesError) throw valuesError;

      // Organize data for grid
      const organized = (kpisData || []).map(kpi => {
        const section = sectionsData?.find(s => s.section_id === kpi.section_id);
        
        const values: { [periodId: string]: any } = {};
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
            name: 'Unknown Section'
          }
        };
      });

      setGridData(organized);

      // Apply filters
      let filteredKpis = kpisData || [];
      if (selectedSection !== 'all') {
        filteredKpis = filteredKpis.filter(kpi => kpi.section_id === selectedSection);
      }

      // Organize values by KPI
      const kpiValuesMap = new Map();
      (valuesData || []).forEach(value => {
        if (!kpiValuesMap.has(value.kpi_id)) {
          kpiValuesMap.set(value.kpi_id, {});
        }
        kpiValuesMap.get(value.kpi_id)[value.period_id] = value;
      });

      // Calculate statistics based on percentage of months completed for each KPI
      const totalKpis = filteredKpis.length;
      const totalPeriods = periodsData?.length || 12;
      
      // Calculate completion as percentage of months done for each KPI
      let totalCompletionPercentage = 0;
      let totalInProgressPercentage = 0;
      let totalNotStartedPercentage = 0;
      let totalBlockedPercentage = 0;

      filteredKpis.forEach(kpi => {
        const values = kpiValuesMap.get(kpi.kpi_id) || {};
        
        if (selectedPeriod !== 'all') {
          // For specific period, simple status check
          const value = values[selectedPeriod] as any;
          const status = value?.status || 'not_started';
          
          if (status === 'done') totalCompletionPercentage += 100;
          else if (status === 'in_progress') totalInProgressPercentage += 100;
          else if (status === 'blocked') totalBlockedPercentage += 100;
          else totalNotStartedPercentage += 100;
        } else {
          // For all periods, calculate percentage of months with each status
          let doneCount = 0;
          let inProgressCount = 0;
          let blockedCount = 0;
          let notStartedCount = 0;
          
          (periodsData || []).forEach(period => {
            const value = values[period.period_id] as any;
            const status = value?.status || 'not_started';
            
            if (status === 'done') doneCount++;
            else if (status === 'in_progress') inProgressCount++;
            else if (status === 'blocked') blockedCount++;
            else notStartedCount++;
          });
          
          // Add percentage for this KPI
          totalCompletionPercentage += (doneCount / totalPeriods) * 100;
          totalInProgressPercentage += (inProgressCount / totalPeriods) * 100;
          totalBlockedPercentage += (blockedCount / totalPeriods) * 100;
          totalNotStartedPercentage += (notStartedCount / totalPeriods) * 100;
        }
      });

      // Calculate average percentages across all KPIs
      const completionPercentage = totalKpis > 0 ? totalCompletionPercentage / totalKpis : 0;
      const inProgressPercentage = totalKpis > 0 ? totalInProgressPercentage / totalKpis : 0;
      const notStartedPercentage = totalKpis > 0 ? totalNotStartedPercentage / totalKpis : 0;
      const blockedPercentage = totalKpis > 0 ? totalBlockedPercentage / totalKpis : 0;

      // Calculate section statistics using percentage of months completed
      const sectionStatsMap = new Map();
      
      filteredKpis.forEach(kpi => {
        const section = sectionsData?.find(s => s.section_id === kpi.section_id);
        if (!section) return;

        const sectionKey = section.section_id;
        if (!sectionStatsMap.has(sectionKey)) {
          sectionStatsMap.set(sectionKey, {
            sectionName: section.name,
            sectionNumber: section.order_idx,
            totalKpis: 0,
            totalCompletionPercentage: 0
          });
        }

        const sectionStats = sectionStatsMap.get(sectionKey);
        sectionStats.totalKpis++;

        // Calculate percentage of months completed for this KPI
        const values = kpiValuesMap.get(kpi.kpi_id) || {};
        
        if (selectedPeriod !== 'all') {
          // For specific period, add 100% if done, 0% otherwise
          const value = values[selectedPeriod] as any;
          if (value?.status === 'done') {
            sectionStats.totalCompletionPercentage += 100;
          }
        } else {
          // For all periods, calculate percentage of months done
          let doneCount = 0;
          (periodsData || []).forEach(period => {
            const value = values[period.period_id] as any;
            if (value?.status === 'done') {
              doneCount++;
            }
          });
          sectionStats.totalCompletionPercentage += (doneCount / totalPeriods) * 100;
        }
      });

      const sectionStats = Array.from(sectionStatsMap.values())
        .map(s => ({
          sectionName: s.sectionName,
          sectionNumber: s.sectionNumber,
          total: s.totalKpis,
          completed: Math.round(s.totalKpis * (s.totalCompletionPercentage / s.totalKpis) / 100), // For display
          completionPercentage: s.totalKpis > 0 ? s.totalCompletionPercentage / s.totalKpis : 0,
          trend: 'stable' as const
        }))
        .sort((a, b) => a.sectionNumber - b.sectionNumber);

      // Calculate period comparison
      const periodComparison = (periodsData || []).map(period => {
        let completed = 0;
        filteredKpis.forEach(kpi => {
          const values = kpiValuesMap.get(kpi.kpi_id) || {};
          const value = values[period.period_id] as any;
          if (value?.status === 'done') {
            completed++;
          }
        });

        return {
          month: period.label,
          total: filteredKpis.length,
          completed,
          completionPercentage: filteredKpis.length > 0 ? (completed / filteredKpis.length) * 100 : 0
        };
      });

      // Top performers (sections with >70% completion)
      const topPerformers = sectionStats
        .filter(s => s.completionPercentage >= 70)
        .sort((a, b) => b.completionPercentage - a.completionPercentage)
        .slice(0, 3)
        .map(s => ({
          section: s.sectionName,
          percentage: s.completionPercentage
        }));

      // Needs attention (sections with <40% completion)
      const needsAttention = sectionStats
        .filter(s => s.completionPercentage < 40)
        .sort((a, b) => a.completionPercentage - b.completionPercentage)
        .slice(0, 3)
        .map(s => ({
          section: s.sectionName,
          percentage: s.completionPercentage
        }));

      setAnalytics({
        totalKpis,
        completionPercentage,
        inProgressPercentage,
        notStartedPercentage,
        blockedPercentage,
        sectionStats,
        periodComparison,
        topPerformers,
        needsAttention
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedSection]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    let mounted = true;
    let refreshInterval: NodeJS.Timeout;
    
    // Initial load
    if (mounted) {
      loadAnalytics();
    }
    
    // Set up periodic refresh every 30 seconds to keep connection alive
    refreshInterval = setInterval(() => {
      if (mounted) {
        loadAnalytics();
      }
    }, 30000); // 30 seconds
    
    return () => {
      mounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-900">Loading Analytics...</div>
      </div>
    );
  }

  const pieData = [
    { name: 'Completed', value: analytics.completionPercentage, color: STATUS_COLORS.done },
    { name: 'In Progress', value: analytics.inProgressPercentage, color: STATUS_COLORS.in_progress },
    { name: 'Not Started', value: analytics.notStartedPercentage, color: STATUS_COLORS.not_started },
    { name: 'Blocked', value: analytics.blockedPercentage, color: STATUS_COLORS.blocked },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 p-6 min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">HSE Performance Overview (KPIs 1.1 - 9.12)</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 w-fit">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <div className="flex gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Periods</option>
                {periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sections</option>
                {sections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>

              {(selectedPeriod !== 'all' || selectedSection !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedPeriod('all');
                    setSelectedSection('all');
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Completion</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  {analytics.completionPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{analytics.totalKpis} KPIs tracked</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">
                  {analytics.inProgressPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Active tracking</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Not Started</p>
                <p className="text-4xl font-bold text-gray-600 mt-2">
                  {analytics.notStartedPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-4xl font-bold text-red-600 mt-2">
                  {analytics.blockedPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Needs attention</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-green-600" />
              Top Performing Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformers.length > 0 ? (
                analytics.topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium text-gray-900">{performer.section}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">
                        {performer.percentage.toFixed(1)}%
                      </span>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No sections with &gt;70% completion yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Requires Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.needsAttention.length > 0 ? (
                analytics.needsAttention.map((section, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-gray-900">{section.section}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        {section.percentage.toFixed(1)}%
                      </span>
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">All sections performing well</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry: any) => `${(entry.value || 0).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return `${numValue.toFixed(1)}%`;
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Period Trend */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Completion Trend by Period</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.periodComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  label={{ value: 'Completion %', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                />
                <Tooltip 
                  formatter={(value: any) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return `${numValue.toFixed(1)}%`;
                  }} 
                />
                <Bar 
                  dataKey="completionPercentage" 
                  fill={STATUS_COLORS.done}
                  radius={[8, 8, 0, 0]}
                  name="Completion %"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Section Performance with Individual KPIs */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Section Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analytics.sectionStats.map((section, sectionIndex) => {
              // Get KPIs for this section
              const sectionKpis = gridData
                .filter(item => item.section.section_id === section.sectionName && 
                               (selectedSection === 'all' || item.section.section_id === selectedSection))
                .map((item, kpiIndex) => {
                  // Calculate completion percentage for this specific KPI
                  let completedMonths = 0;
                  const totalMonths = selectedPeriod === 'all' ? periods.length : 1;
                  
                  if (selectedPeriod === 'all') {
                    periods.forEach(period => {
                      const value = item.values[period.period_id];
                      if (value?.status === 'done') completedMonths++;
                    });
                  } else {
                    const value = item.values[selectedPeriod];
                    if (value?.status === 'done') completedMonths = 1;
                  }
                  
                  const kpiCompletionPercentage = totalMonths > 0 ? (completedMonths / totalMonths) * 100 : 0;
                  
                  return {
                    code: item.kpi.code,
                    name: item.kpi.name,
                    completionPercentage: kpiCompletionPercentage,
                    completedMonths,
                    totalMonths
                  };
                });

              return (
                <div key={sectionIndex} className="space-y-3 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                  {/* Section Header */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <h4 className="font-bold text-gray-900 text-lg">{section.sectionName}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        Overall: {section.completed} of {section.total} KPIs
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {section.completionPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Section Progress Bar */}
                  <Progress 
                    value={section.completionPercentage} 
                    className="h-3"
                    style={{
                      backgroundColor: '#e5e7eb'
                    }}
                  />
                  
                  {/* Individual KPIs with Monthly Breakdown */}
                  <div className="space-y-4 mt-4">
                    {gridData
                      .filter(item => item.section.section_id === section.sectionName && 
                                     (selectedSection === 'all' || item.section.section_id === selectedSection))
                      .map((item, kpiIndex) => {
                        // Calculate overall completion
                        let completedMonths = 0;
                        const totalMonths = selectedPeriod === 'all' ? periods.length : 1;
                        
                        if (selectedPeriod === 'all') {
                          periods.forEach(period => {
                            const value = item.values[period.period_id];
                            if (value?.status === 'done') completedMonths++;
                          });
                        } else {
                          const value = item.values[selectedPeriod];
                          if (value?.status === 'done') completedMonths = 1;
                        }
                        
                        const kpiCompletionPercentage = totalMonths > 0 ? (completedMonths / totalMonths) * 100 : 0;
                        
                        return (
                          <div key={kpiIndex} className="bg-gray-50 rounded-md border border-gray-200">
                            {/* KPI Header */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-xs font-mono font-bold text-white bg-blue-600 px-2 py-1 rounded shadow">
                                  {item.kpi.code}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {item.kpi.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-600 font-medium">
                                  {completedMonths}/{totalMonths} months
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-300 rounded-full h-2.5 shadow-inner">
                                    <div 
                                      className="h-2.5 rounded-full transition-all duration-300 shadow-sm"
                                      style={{
                                        width: `${kpiCompletionPercentage}%`,
                                        backgroundColor: kpiCompletionPercentage >= 70 ? '#10B981' : 
                                                       kpiCompletionPercentage >= 40 ? '#F59E0B' : '#EF4444'
                                      }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold min-w-[3rem] text-right ${
                                    kpiCompletionPercentage >= 70 ? 'text-green-600' :
                                    kpiCompletionPercentage >= 40 ? 'text-amber-600' :
                                    'text-red-600'
                                  }`}>
                                    {kpiCompletionPercentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Monthly Status Grid */}
                            {selectedPeriod === 'all' && (
                              <div className="p-3">
                                <div className="grid grid-cols-12 gap-2">
                                  {periods.map((period, periodIndex) => {
                                    const value = item.values[period.period_id];
                                    const status = value?.status || 'not_started';
                                    
                                    // Status colors and icons
                                    const statusConfig = {
                                      'done': { 
                                        bg: 'bg-green-100', 
                                        border: 'border-green-400', 
                                        text: 'text-green-700',
                                        icon: '✓'
                                      },
                                      'in_progress': { 
                                        bg: 'bg-blue-100', 
                                        border: 'border-blue-400', 
                                        text: 'text-blue-700',
                                        icon: '◐'
                                      },
                                      'blocked': { 
                                        bg: 'bg-red-100', 
                                        border: 'border-red-400', 
                                        text: 'text-red-700',
                                        icon: '✕'
                                      },
                                      'needs_review': { 
                                        bg: 'bg-amber-100', 
                                        border: 'border-amber-400', 
                                        text: 'text-amber-700',
                                        icon: '!'
                                      },
                                      'not_started': { 
                                        bg: 'bg-gray-100', 
                                        border: 'border-gray-300', 
                                        text: 'text-gray-500',
                                        icon: '○'
                                      }
                                    };
                                    
                                    const config = statusConfig[status as keyof typeof statusConfig];
                                    
                                    return (
                                      <div
                                        key={periodIndex}
                                        className={`${config.bg} ${config.border} border-2 rounded-md p-2 text-center transition-all hover:shadow-md hover:scale-105 cursor-pointer`}
                                        title={`${period.label}: ${status.replace('_', ' ').toUpperCase()}`}
                                      >
                                        <div className={`text-xs font-bold ${config.text} mb-1`}>
                                          {period.label.split('-')[0]}
                                        </div>
                                        <div className={`text-lg font-bold ${config.text}`}>
                                          {config.icon}
                                        </div>
                                        <div className={`text-[10px] ${config.text} mt-1 font-medium`}>
                                          {status === 'done' ? 'Done' :
                                           status === 'in_progress' ? 'Progress' :
                                           status === 'blocked' ? 'Blocked' :
                                           status === 'needs_review' ? 'Review' :
                                           'Pending'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Month Legend */}
                                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">Done</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">In Progress</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">Needs Review</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">Blocked</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                    <span className="text-xs text-gray-600">Not Started</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
