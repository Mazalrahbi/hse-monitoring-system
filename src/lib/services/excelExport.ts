import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase/client';
import type { Kpi, Section, KpiValue, KpiPeriod } from '@/lib/types/database';

type KpiWithDetails = Kpi & {
  section: Section;
  kpi_values: Array<KpiValue & {
    kpi_period: KpiPeriod;
  }>;
};

export class ExcelExportService {
  async exportHSEMonitoringPlan(): Promise<void> {
    try {
      // Fetch basic KPI data first
      const { data: kpis, error: kpiError } = await supabase
        .from('kpi')
        .select('*')
        .eq('is_active', true)
        .order('section_id')
        .order('code');

      if (kpiError) {
        console.error('Error fetching KPI data:', kpiError);
        throw new Error('Failed to fetch KPI data');
      }

      if (!kpis || kpis.length === 0) {
        throw new Error('No KPI data found');
      }

      // Fetch sections separately
      const { data: sections, error: sectionError } = await supabase
        .from('section')
        .select('*')
        .eq('is_active', true);

      if (sectionError) {
        console.error('Error fetching sections:', sectionError);
        throw new Error('Failed to fetch sections');
      }

      // Fetch KPI values separately
      const { data: kpiValues, error: valuesError } = await supabase
        .from('kpi_value')
        .select('*');

      if (valuesError) {
        console.error('Error fetching KPI values:', valuesError);
      }

      // Fetch periods separately
      const { data: periods, error: periodsError } = await supabase
        .from('kpi_period')
        .select('*');

      if (periodsError) {
        console.error('Error fetching periods:', periodsError);
      }

      // Combine the data manually
      const kpisWithDetails = kpis.map(kpi => ({
        ...kpi,
        section: sections?.find(s => s.section_id === kpi.section_id) || null,
        kpi_values: (kpiValues || [])
          .filter(v => v.kpi_id === kpi.kpi_id)
          .map(v => ({
            ...v,
            kpi_period: periods?.find(p => p.period_id === v.period_id) || null
          }))
      })) as KpiWithDetails[];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheetData = this.formatDataForExcel(kpisWithDetails);
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths for better formatting
      const columnWidths = [
        { wch: 5 },   // #
        { wch: 60 },  // Actions
        { wch: 20 },  // Action Owner
        { wch: 15 },  // Action Party
        { wch: 20 },  // Target/Frequency
        { wch: 10 },  // Jan-25
        { wch: 10 },  // Feb-25
        { wch: 10 },  // Mar-25
        { wch: 10 },  // Apr-25
        { wch: 10 },  // May-25
        { wch: 10 },  // Jun-25
        { wch: 10 },  // Jul-25
        { wch: 10 },  // Aug-25
        { wch: 10 },  // Sep-25
        { wch: 10 },  // Oct-25
        { wch: 10 },  // Nov-25
        { wch: 10 },  // Dec-25
        { wch: 25 },  // Measurement
      ];

      worksheet['!cols'] = columnWidths;

      // Apply some basic styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Style header rows
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 3, c: C }); // Row 4 is the main header
        if (!worksheet[headerCell]) continue;
        if (!worksheet[headerCell].s) worksheet[headerCell].s = {};
        worksheet[headerCell].s.font = { bold: true };
        worksheet[headerCell].s.fill = { fgColor: { rgb: "E6E6FA" } };
      }

      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'HSE Monitoring Plan');

      // Generate the Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });

      // Save the file
      const data = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `HSE_Monitoring_Plan_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  }

  private formatDataForExcel(kpis: KpiWithDetails[]): string[][] {
    const data: string[][] = [];

    // Add header rows (matching the original template)
    data.push(['', '', '2025 HSE Monitoring Plan', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['', '', 'Contractor Name: Black Gold Integrated Solution PDO Nimr', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['', '', 'PDO Contract Holder: Al Salti Anwar, UPKC1', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Add column headers
    data.push([
      '#',
      'Actions', 
      'ACTION OWNER',
      'Action Party',
      'Target/ Frequency',
      'Jan-25',
      'Feb-25', 
      'Mar-25',
      'Apr-25',
      'May-25',
      'Jun-25',
      'Jul-25',
      'Aug-25',
      'Sep-25',
      'Oct-25',
      'Nov-25',
      'Dec-25',
      'Measurement'
    ]);

    // Group KPIs by section
    const sectionGroups = new Map<string, KpiWithDetails[]>();
    kpis.forEach(kpi => {
      const sectionName = kpi.section?.name || 'Unknown Section';
      if (!sectionGroups.has(sectionName)) {
        sectionGroups.set(sectionName, []);
      }
      sectionGroups.get(sectionName)?.push(kpi);
    });

    // Add data rows for each section
    let sectionIndex = 1;
    for (const [sectionName, sectionKpis] of sectionGroups) {
      // Add section header
      data.push([sectionIndex.toString(), sectionName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);

      // Add KPIs for this section
      sectionKpis.forEach(kpi => {
        const monthlyValues = this.getMonthlyValues(kpi);
        
        data.push([
          kpi.code || '',
          kpi.name || '',
          kpi.owner_user_id || '',
          '', // Action Party - would need additional data
          kpi.target_formula || '',
          monthlyValues.jan || '',
          monthlyValues.feb || '',
          monthlyValues.mar || '',
          monthlyValues.apr || '',
          monthlyValues.may || '',
          monthlyValues.jun || '',
          monthlyValues.jul || '',
          monthlyValues.aug || '',
          monthlyValues.sep || '',
          monthlyValues.oct || '',
          monthlyValues.nov || '',
          monthlyValues.dec || '',
          kpi.unit || ''
        ]);
      });

      sectionIndex++;
    }

    // Add KPI summary section
    data.push(['']);
    data.push(['10', 'HSE KPI - add as necessary in agreement with CH', '2024 Actual', '2025 Target', '', 'Contractor', 'Contractor', 'Name', 'Name', 'Sign', 'Sign', 'Sign', 'Sign', 'Date', 'Date', '', '']);
    
    const kpiSummaryItems = [
      ['10.1', 'Lost time Injury - LTI (Number)', 'Zero', 'Zero'],
      ['10.2', 'Total Recordable Cases - TRC (Number)', 'Zero', 'Zero'],
      ['10.3', 'Motor Vehicle Incidents - MVI (Number)', 'Zero', 'Zero'],
      ['10.4', 'Road Safety LSR Violations - Frequency per 1 Million Km Driven', 'Zero', 'Zero'],
      ['10.5', 'Fatality', 'Zero', 'Zero'],
      ['10.6', 'SIF (Serious Injury and Fatality)', 'Zero', 'Zero'],
      ['10.7', 'NM reporting (serves as a leading indicator to strengthen the reporting culture)', '5', '12'],
      ['10.9', 'Environmental Incidents', 'Zero', 'Zero'],
      ['10.10', 'NCR Closeout Status (%)', '100%', '100%'],
      ['10.11', 'HSE Monitoring Plan Compliance (%)', '100%', '100%']
    ];

    kpiSummaryItems.forEach((item: string[]) => {
      data.push([...item, '', '', '', '', '', '', '', '', '', '', '', '', '']);
    });

    return data;
  }

  private getMonthlyValues(kpi: KpiWithDetails): Record<string, string> {
    const monthlyValues: Record<string, string> = {
      jan: '', feb: '', mar: '', apr: '', may: '', jun: '',
      jul: '', aug: '', sep: '', oct: '', nov: '', dec: ''
    };

    // Map KPI values to months based on periods
    kpi.kpi_values.forEach(value => {
      if (!value.kpi_period) return;
      
      const periodStart = new Date(value.kpi_period.start_date);
      const month = periodStart.getMonth(); // 0-based
      
      let monthKey = '';
      switch (month) {
        case 0: monthKey = 'jan'; break;
        case 1: monthKey = 'feb'; break;
        case 2: monthKey = 'mar'; break;
        case 3: monthKey = 'apr'; break;
        case 4: monthKey = 'may'; break;
        case 5: monthKey = 'jun'; break;
        case 6: monthKey = 'jul'; break;
        case 7: monthKey = 'aug'; break;
        case 8: monthKey = 'sep'; break;
        case 9: monthKey = 'oct'; break;
        case 10: monthKey = 'nov'; break;
        case 11: monthKey = 'dec'; break;
      }

      if (monthKey) {
        // Use numeric value if available, otherwise use status or text value
        monthlyValues[monthKey] = value.numeric_value?.toString() || 
                                 value.status || 
                                 value.text_value || 
                                 '';
      }
    });

    return monthlyValues;
  }
}

// Export a singleton instance
export const excelExportService = new ExcelExportService();
