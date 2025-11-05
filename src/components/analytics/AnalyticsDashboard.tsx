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
  const [periods, setPeriods] = useState<Array<{id: string, label: string}>>([]);
  const [sections, setSections] = useState<Array<{id: string, name: string}>>([]);

  const loadFilters = useCallback(async () => {
    try {
      // Load periods
      const { data: periodsData } = await supabaseClient
        .from('period')
        .select('id, label')
        .order('label');
      
      if (periodsData) {
        setPeriods(periodsData);
      }

      // Load sections (only 1-9)
      const { data: sectionsData } = await supabaseClient
        .from('section')
        .select('id, name, number')
        .gte('number', 1)
        .lte('number', 9)
        .order('number');
      
      if (sectionsData) {
        setSections(sectionsData);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Build query with filters - only get KPIs from sections 1-9 with subsections 1-12
      let query = supabaseClient
        .from('kpi_value')
        .select(`
          *,
          kpi:kpi_id (
            id,
            kpi_number,
            name,
            section:section_id (
              id,
              name,
              number
            )
          ),
          period:period_id (
            id,
            label
          )
        `);

      // Apply period filter if selected
      if (selectedPeriod !== 'all') {
        query = query.eq('period_id', selectedPeriod);
      }

      const { data: kpiValues, error } = await query;

      if (error) throw error;

      // Filter to only include KPIs from sections 1-9
      const values = (kpiValues || []).filter(v => {
        const sectionNum = v.kpi?.section?.number;
        const kpiNum = v.kpi?.kpi_number;
        
        // Check if section number exists and is between 1-9
        if (sectionNum !== undefined && sectionNum !== null && sectionNum >= 1 && sectionNum <= 9) {
          // If KPI number exists, validate it
          if (kpiNum) {
            const parts = kpiNum.split('.');
            if (parts.length === 2) {
              const [section, subsection] = parts.map(Number);
              // Allow any valid decimal structure for sections 1-9
              return !isNaN(section) && !isNaN(subsection) && section >= 1 && section <= 9;
            }
          }
          // If no KPI number, still include if section is valid
          return true;
        }
        return false;
      });

      // Apply section filter if selected
      const filteredValues = selectedSection !== 'all' 
        ? values.filter(v => v.kpi?.section?.id === selectedSection)
        : values;

      // Calculate overall statistics (percentage-based)
      const totalKpis = filteredValues.length;
      const completedKpis = filteredValues.filter(v => v.status === 'done').length;
      const inProgressKpis = filteredValues.filter(v => v.status === 'in_progress').length;
      const notStartedKpis = filteredValues.filter(v => v.status === 'not_started').length;
      const blockedKpis = filteredValues.filter(v => v.status === 'blocked').length;

      const completionPercentage = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;
      const inProgressPercentage = totalKpis > 0 ? (inProgressKpis / totalKpis) * 100 : 0;
      const notStartedPercentage = totalKpis > 0 ? (notStartedKpis / totalKpis) * 100 : 0;
      const blockedPercentage = totalKpis > 0 ? (blockedKpis / totalKpis) * 100 : 0;

      // Calculate section statistics
      const sectionMap = new Map();
      filteredValues.forEach(value => {
        const sectionName = value.kpi?.section?.name || 'Unknown';
        const sectionNumber = value.kpi?.section?.number;
        
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, {
            sectionName,
            sectionNumber,
            total: 0,
            completed: 0,
            completionPercentage: 0,
            trend: 'stable' as const
          });
        }
        
        const section = sectionMap.get(sectionName);
        section.total++;
        
        if (value.status === 'done') {
          section.completed++;
        }
        
        section.completionPercentage = section.total > 0 ? (section.completed / section.total) * 100 : 0;
      });

      const sectionStats = Array.from(sectionMap.values())
        .sort((a, b) => (a.sectionNumber || 0) - (b.sectionNumber || 0));

      // Calculate period comparison
      const periodMap = new Map();
      filteredValues.forEach(value => {
        const monthLabel = value.period?.label || 'Unknown';
        if (!periodMap.has(monthLabel)) {
          periodMap.set(monthLabel, {
            month: monthLabel,
            total: 0,
            completed: 0,
            completionPercentage: 0
          });
        }
        
        const period = periodMap.get(monthLabel);
        period.total++;
        
        if (value.status === 'done') {
          period.completed++;
        }
        
        period.completionPercentage = period.total > 0 ? (period.completed / period.total) * 100 : 0;
      });

      const periodComparison = Array.from(periodMap.values()).sort((a, b) => {
        const monthOrder = ['Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'May-25', 'Jun-25', 
                           'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
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

      // Needs attention (sections with <40% completion or any blocked items)
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
    loadAnalytics();
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">HSE Performance Overview (Sections 1-9)</p>
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
                <p className="text-xs text-gray-500 mt-1">{analytics.totalKpis} Total KPIs</p>
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
                  label={(entry) => `${(entry.value || 0).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
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
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
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

      {/* Section Performance */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Section Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.sectionStats.map((section, index) => (
              <div key={index} className="space-y-2 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{section.sectionName}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {section.completed} of {section.total} KPIs
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {section.completionPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={section.completionPercentage} 
                  className="h-2"
                  style={{
                    backgroundColor: '#e5e7eb'
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
