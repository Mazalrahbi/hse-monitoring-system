'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { KpiStatus, SiteAnalytics } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Target,
  Calendar,
  Users
} from 'lucide-react';

interface AnalyticsData {
  totalKpis: number;
  completedKpis: number;
  inProgressKpis: number;
  notStartedKpis: number;
  blockedKpis: number;
  completionRate: number;
  sectionStats: Array<{
    sectionName: string;
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    blocked: number;
    completionRate: number;
  }>;
  monthlyProgress: Array<{
    month: string;
    completed: number;
    inProgress: number;
    notStarted: number;
    blocked: number;
  }>;
}

const STATUS_COLORS = {
  done: '#10B981',
  in_progress: '#F59E0B', 
  not_started: '#6B7280',
  blocked: '#EF4444',
  needs_review: '#3B82F6'
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalKpis: 0,
    completedKpis: 0,
    inProgressKpis: 0,
    notStartedKpis: 0,
    blockedKpis: 0,
    completionRate: 0,
    sectionStats: [],
    monthlyProgress: []
  });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      // Fetch KPI values with related data
      const { data: kpiValues, error } = await supabaseClient
        .from('kpi_value')
        .select(`
          *,
          kpi:kpi_id (
            *,
            section:section_id (
              *
            )
          ),
          period:period_id (
            *
          )
        `);

      if (error) throw error;

      const values = kpiValues || [];
      
      // Calculate overall statistics
      const totalKpis = values.length;
      const completedKpis = values.filter(v => v.status === 'done').length;
      const inProgressKpis = values.filter(v => v.status === 'in_progress').length;
      const notStartedKpis = values.filter(v => v.status === 'not_started').length;
      const blockedKpis = values.filter(v => v.status === 'blocked').length;
      const completionRate = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;

      // Calculate section statistics
      const sectionMap = new Map();
      values.forEach(value => {
        const sectionName = value.kpi?.section?.name || 'Unknown';
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, {
            sectionName,
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            blocked: 0,
            completionRate: 0
          });
        }
        
        const section = sectionMap.get(sectionName);
        section.total++;
        
        switch (value.status) {
          case 'done':
            section.completed++;
            break;
          case 'in_progress':
            section.inProgress++;
            break;
          case 'not_started':
            section.notStarted++;
            break;
          case 'blocked':
            section.blocked++;
            break;
        }
        
        section.completionRate = section.total > 0 ? (section.completed / section.total) * 100 : 0;
      });

      const sectionStats = Array.from(sectionMap.values());

      // Calculate monthly progress
      const monthlyMap = new Map();
      values.forEach(value => {
        const monthLabel = value.period?.label || 'Unknown';
        if (!monthlyMap.has(monthLabel)) {
          monthlyMap.set(monthLabel, {
            month: monthLabel,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            blocked: 0
          });
        }
        
        const month = monthlyMap.get(monthLabel);
        switch (value.status) {
          case 'done':
            month.completed++;
            break;
          case 'in_progress':
            month.inProgress++;
            break;
          case 'not_started':
            month.notStarted++;
            break;
          case 'blocked':
            month.blocked++;
            break;
        }
      });

      const monthlyProgress = Array.from(monthlyMap.values()).sort((a, b) => {
        const monthOrder = ['Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'May-25', 'Jun-25', 
                           'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

      setAnalytics({
        totalKpis,
        completedKpis,
        inProgressKpis,
        notStartedKpis,
        blockedKpis,
        completionRate,
        sectionStats,
        monthlyProgress
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    { name: 'Completed', value: analytics.completedKpis, color: STATUS_COLORS.done },
    { name: 'In Progress', value: analytics.inProgressKpis, color: STATUS_COLORS.in_progress },
    { name: 'Not Started', value: analytics.notStartedKpis, color: STATUS_COLORS.not_started },
    { name: 'Blocked', value: analytics.blockedKpis, color: STATUS_COLORS.blocked },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HSE Analytics Dashboard</h1>
          <p className="text-lg text-gray-800 font-medium">Real-time insights into your HSE monitoring performance</p>
        </div>
        <Badge variant="outline" className="text-sm font-medium border-gray-800 text-gray-800">
          Last updated: {new Date().toLocaleString()}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Total KPIs</CardTitle>
            <Target className="h-5 w-5 text-gray-800" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalKpis}</div>
            <p className="text-sm font-medium text-gray-700">Across all sections</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{analytics.completedKpis}</div>
            <p className="text-sm font-bold text-green-800">
              {analytics.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md bg-yellow-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-gray-900">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-yellow-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">{analytics.inProgressKpis}</div>
            <p className="text-sm font-bold text-yellow-800">Active tracking</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md bg-gray-50 border-gray-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Not Started</CardTitle>
            <Calendar className="h-5 w-5 text-gray-800" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{analytics.notStartedKpis}</div>
            <p className="text-sm font-bold text-gray-700">Pending initiation</p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-gray-900">Blocked</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{analytics.blockedKpis}</div>
            <p className="text-sm font-bold text-red-800">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="border-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">KPI Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Progress */}
        <Card className="border-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Monthly Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="1"
                  stroke={STATUS_COLORS.done} 
                  fill={STATUS_COLORS.done}
                  name="Completed"
                />
                <Area 
                  type="monotone" 
                  dataKey="inProgress" 
                  stackId="1"
                  stroke={STATUS_COLORS.in_progress} 
                  fill={STATUS_COLORS.in_progress}
                  name="In Progress"
                />
                <Area 
                  type="monotone" 
                  dataKey="notStarted" 
                  stackId="1"
                  stroke={STATUS_COLORS.not_started} 
                  fill={STATUS_COLORS.not_started}
                  name="Not Started"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Section Performance */}
      <Card className="border-2 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">Section Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analytics.sectionStats.map((section, index) => (
              <div key={index} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-base">{section.sectionName}</h4>
                  <span className="text-sm font-bold text-gray-800 bg-white px-2 py-1 rounded">
                    {section.completed}/{section.total} completed ({section.completionRate.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={section.completionRate} className="h-3" />
                <div className="flex gap-6 text-sm font-medium text-gray-800">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    Done: {section.completed}
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                    In Progress: {section.inProgress}
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    Not Started: {section.notStarted}
                  </span>
                  {section.blocked > 0 && (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600"></div>
                      Blocked: {section.blocked}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
