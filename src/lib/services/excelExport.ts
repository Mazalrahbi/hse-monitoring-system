import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase/client';
import type { Kpi, Section, KpiValue, KpiPeriod } from '@/lib/types/database';

type KpiWithDetails = Kpi & {
  section: Section;
  kpi_values: Array<KpiValue & {
    kpi_period: KpiPeriod;
  }>;
};

interface MonthlyKpiData {
  kpiCode: string;
  kpiName: string;
  actionOwner: string;
  actionParty: string;
  targetFrequency: string;
  measurement: string;
  monthValues: Record<string, string | number>;
  rowNumber: number;
}

export class ExcelExportService {
  private readonly TEMPLATE_NAME = 'hse-monitoring-template-2025.xlsx';
  private readonly TEMPLATE_BUCKET = 'excel-templates';
  
  // Excel cell mapping based on original template structure
  private readonly MONTH_COLUMNS = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  private readonly MONTH_NAMES = ['Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'May-25', 'Jun-25', 
                                  'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25'];
  
  /**
   * Main export function - generates pixel-perfect Excel matching the original template
   */
  async exportHSEMonitoringPlan(): Promise<void> {
    try {
      console.log('Starting Excel export...');
      
      // Step 1: Fetch template from storage or use default
      const workbook = await this.loadTemplate();
      
      // Step 2: Get worksheet
      const worksheet = workbook.getWorksheet('Table 1') || workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('Worksheet not found in template');
      }
      
      // Step 3: Fetch all KPI data from database
      const kpisWithData = await this.fetchKpiData();
      
      // Step 4: Update header section (contractor info)
      this.updateHeaderSection(worksheet);
      
      // Step 5: Update KPI data cells (preserving all formatting)
      await this.updateKpiDataCells(worksheet, kpisWithData);
      
      // Step 6: Update footer KPI summary
      this.updateFooterSection(worksheet);
      
      // Step 7: Generate and download the file
      await this.downloadWorkbook(workbook);
      
      console.log('Excel export completed successfully');
      
    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  }

  /**
   * Load template from Supabase storage or create new workbook
   */
  private async loadTemplate(): Promise<ExcelJS.Workbook> {
    try {
      // Try to fetch template from storage
      const { data, error } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .download(this.TEMPLATE_NAME);

      if (error || !data) {
        console.warn('Template not found in storage, creating new workbook with basic structure');
        return this.createBasicTemplate();
      }

      // Load template with ExcelJS (preserves all formatting)
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await data.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      console.log('Template loaded successfully from storage');
      return workbook;
      
    } catch (error) {
      console.warn('Error loading template, creating new workbook:', error);
      return this.createBasicTemplate();
    }
  }

  /**
   * Create a basic template structure if original template is not available
   */
  private createBasicTemplate(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Table 1');

    // Set column widths
    worksheet.columns = [
      { key: 'number', width: 6 },
      { key: 'actions', width: 65 },
      { key: 'owner', width: 20 },
      { key: 'party', width: 15 },
      { key: 'frequency', width: 20 },
      ...this.MONTH_COLUMNS.map(() => ({ width: 10 })),
      { key: 'measurement', width: 25 }
    ];

    // Add header rows
    worksheet.mergeCells('C1:Q1');
    worksheet.getCell('C1').value = '2025 HSE Monitoring Plan';
    worksheet.getCell('C1').font = { bold: true, size: 14 };
    worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('C1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells('C2:Q2');
    worksheet.getCell('C2').value = 'Contractor Name: Black Gold Integrated Solution PDO Nimr';
    worksheet.getCell('C2').font = { bold: true, size: 11 };
    worksheet.getCell('C2').alignment = { horizontal: 'center' };
    worksheet.getCell('C2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };

    worksheet.mergeCells('C3:Q3');
    worksheet.getCell('C3').value = 'PDO Contract Holder: Al Salti Anwar, UPKC1';
    worksheet.getCell('C3').font = { bold: true, size: 11 };
    worksheet.getCell('C3').alignment = { horizontal: 'center' };
    worksheet.getCell('C3').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }
    };

    // Add column headers (Row 4)
    const headers = [
      '#', 'Actions', 'ACTION OWNER', 'Action Party', 'Target/ Frequency',
      ...this.MONTH_NAMES,
      'Measurement'
    ];
    
    worksheet.getRow(4).values = headers;
    worksheet.getRow(4).font = { bold: true, size: 10 };
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(4).height = 20;

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    return workbook;
  }

  /**
   * Fetch all KPI data with sections, values, and periods
   */
  private async fetchKpiData(): Promise<KpiWithDetails[]> {
    // Fetch KPIs
    const { data: kpis, error: kpiError } = await supabase
      .from('kpi')
      .select('*')
      .eq('is_active', true)
      .order('section_id')
      .order('code');

    if (kpiError) throw new Error(`Failed to fetch KPI data: ${kpiError.message}`);
    if (!kpis || kpis.length === 0) throw new Error('No KPI data found');

    // Fetch sections
    const { data: sections, error: sectionError } = await supabase
      .from('section')
      .select('*')
      .eq('is_active', true)
      .order('order_idx');

    if (sectionError) throw new Error(`Failed to fetch sections: ${sectionError.message}`);

    // Fetch KPI values for 2025
    const { data: kpiValues, error: valuesError } = await supabase
      .from('kpi_value')
      .select('*');

    if (valuesError) console.warn('Error fetching KPI values:', valuesError);

    // Fetch periods for 2025
    const { data: periods, error: periodsError } = await supabase
      .from('kpi_period')
      .select('*')
      .eq('period_type', 'monthly')
      .gte('start_date', '2025-01-01')
      .lt('start_date', '2026-01-01')
      .order('start_date');

    if (periodsError) console.warn('Error fetching periods:', periodsError);
    console.log(`Fetched ${periods?.length || 0} periods for 2025`);

    // Combine data
    const kpisWithDetails: KpiWithDetails[] = kpis.map(kpi => ({
      ...kpi,
      section: sections?.find(s => s.section_id === kpi.section_id) || ({} as Section),
      kpi_values: (kpiValues || [])
        .filter(v => v.kpi_id === kpi.kpi_id)
        .map(v => ({
          ...v,
          kpi_period: periods?.find(p => p.period_id === v.period_id) || ({} as KpiPeriod)
        }))
    }));

    console.log(`Fetched ${kpisWithDetails.length} KPIs with data`);
    return kpisWithDetails;
  }

  /**
   * Update header section with current contractor info
   */
  private updateHeaderSection(worksheet: ExcelJS.Worksheet): void {
    // Headers are in rows 1-3, already set in template
    // Only update if you need dynamic contractor names
    // For now, keeping template values as-is
    console.log('Header section preserved from template');
  }

  /**
   * Update KPI data cells - THIS IS THE KEY FUNCTION
   * Updates only cell VALUES, preserves all formatting
   */
  private async updateKpiDataCells(
    worksheet: ExcelJS.Worksheet, 
    kpis: KpiWithDetails[]
  ): Promise<void> {
    // Group KPIs by section
    const sectionGroups = new Map<string, KpiWithDetails[]>();
    kpis.forEach(kpi => {
      const sectionKey = `${kpi.section.order_idx}-${kpi.section.name}`;
      if (!sectionGroups.has(sectionKey)) {
        sectionGroups.set(sectionKey, []);
      }
      sectionGroups.get(sectionKey)!.push(kpi);
    });

    let currentRow = 5; // Start after header row (row 4)

    // Process each section
    for (const [sectionKey, sectionKpis] of Array.from(sectionGroups.entries()).sort()) {
      const [sectionNumber, sectionName] = sectionKey.split('-');
      
      // Section header row
      worksheet.getCell(`A${currentRow}`).value = sectionNumber;
      worksheet.getCell(`B${currentRow}`).value = sectionName;
      currentRow++;

      // Process each KPI in the section
      for (const kpi of sectionKpis) {
        // Column A: KPI Code (e.g., "1.1", "1.2")
        worksheet.getCell(`A${currentRow}`).value = kpi.code || '';
        
        // Column B: KPI Name/Description
        worksheet.getCell(`B${currentRow}`).value = kpi.name || '';
        
        // Column C: Action Owner
        worksheet.getCell(`C${currentRow}`).value = kpi.owner_user_id || '';
        
        // Column D: Action Party (if you have this data)
        worksheet.getCell(`D${currentRow}`).value = ''; // Add if available in your schema
        
        // Column E: Target/Frequency
        worksheet.getCell(`E${currentRow}`).value = kpi.target_formula || '';
        
        // Columns F-Q: Monthly values (Jan-Dec)
        const monthlyValues = this.getMonthlyValuesForKpi(kpi);
        this.MONTH_COLUMNS.forEach((col, index) => {
          const monthKey = this.getMonthKey(index);
          const value = monthlyValues[monthKey];
          
          // Update cell if value exists (including 0, false, or empty string)
          // Only skip if explicitly null or undefined
          if (value !== null && value !== undefined) {
            const cell = worksheet.getCell(`${col}${currentRow}`);
            cell.value = value;
            console.log(`Setting ${col}${currentRow} = ${value} for KPI ${kpi.code}`);
          }
        });
        
        // Column R: Measurement
        worksheet.getCell(`R${currentRow}`).value = kpi.unit || '';
        
        currentRow++;
      }
    }

    console.log(`Updated ${currentRow - 5} rows of KPI data`);
  }

  /**
   * Get monthly values for a specific KPI
   */
  private getMonthlyValuesForKpi(kpi: KpiWithDetails): Record<string, string | number> {
    const monthlyValues: Record<string, string | number> = {};

    console.log(`Processing KPI ${kpi.code}: Found ${kpi.kpi_values.length} values`);
    
    kpi.kpi_values.forEach(value => {
      if (!value.kpi_period || !value.kpi_period.start_date) {
        console.warn(`KPI ${kpi.code}: Skipping value without period or start_date`);
        return;
      }
      
      const periodStart = new Date(value.kpi_period.start_date);
      const monthIndex = periodStart.getMonth(); // 0-11
      const monthKey = this.getMonthKey(monthIndex);
      
      // Use numeric value if available, otherwise status or text
      if (value.numeric_value !== null && value.numeric_value !== undefined) {
        monthlyValues[monthKey] = value.numeric_value;
        console.log(`  ${monthKey}: ${value.numeric_value} (numeric)`);
      } else if (value.status) {
        monthlyValues[monthKey] = value.status;
        console.log(`  ${monthKey}: ${value.status} (status)`);
      } else if (value.text_value) {
        monthlyValues[monthKey] = value.text_value;
        console.log(`  ${monthKey}: ${value.text_value} (text)`);
      } else {
        console.log(`  ${monthKey}: No value found`);
      }
    });

    return monthlyValues;
  }

  /**
   * Get month key from index (0-11)
   */
  private getMonthKey(monthIndex: number): string {
    const keys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return keys[monthIndex] || 'jan';
  }

  /**
   * Update footer section with KPI summary
   */
  private updateFooterSection(worksheet: ExcelJS.Worksheet): void {
    // Footer KPI summary is typically at the bottom of the template
    // If template already has this section, we can update specific cells
    // For now, keeping template values
    console.log('Footer section preserved from template');
  }

  /**
   * Generate Excel file and trigger download
   */
  private async downloadWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `HSE_Monitoring_Plan_${timestamp}.xlsx`;
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`File downloaded: ${filename}`);
  }

  /**
   * Upload template file to Supabase storage (admin function)
   */
  async uploadTemplate(file: File): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(this.TEMPLATE_BUCKET)
        .upload(this.TEMPLATE_NAME, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      console.log('Template uploaded successfully:', data);
    } catch (error) {
      console.error('Failed to upload template:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const excelExportService = new ExcelExportService();
