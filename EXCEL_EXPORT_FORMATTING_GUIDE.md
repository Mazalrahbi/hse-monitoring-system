# Excel Export Formatting Guide - Pixel-Perfect Template Match

## Overview

This guide explains how to create Excel exports that match your original HSE Monitoring Plan template **exactly** - preserving all colors, fonts, borders, merged cells, column widths, row heights, and formatting while populating with live data from the database.

---

## Understanding the Original Template

### Template Structure Analysis

Your original Excel file (`BGIS-HSE-F-044 BGIS site HSE Monitoring Plan 2025.xlsx`) has these key characteristics:

#### Header Section (Rows 1-4)
- **Row 1**: Title "2025 HSE Monitoring Plan" - merged across columns C to Q
- **Row 2**: "Contractor Name:Black Gold Integrated Solution PDO Nimr" - merged across columns C to Q
- **Row 3**: "PDO Contract Holder: Al Salti Anwar, UPKC1" - merged across columns C to Q
- **Columns A-B**: Appear to have logo/image placeholders (showing #VALUE! errors)

#### Column Headers (Row 4)
- Column A: `#`
- Column B: `Actions`
- Column C: `ACTION OWNER`
- Column D: `Action Party`
- Column E: `Target/ Frequency`
- Columns F-Q: Month columns (Jan-25 through Dec-25)
- Column R: `Measurement`

#### Data Section (Rows 5-82)
- **Section Headers**: Bold, different background (rows like "1 Safety Leadership", "2 Worker Welfare")
- **KPI Rows**: Sub-numbered items (1.1, 1.2, etc.)
- **Month Values**: Numeric or text values in month columns
- **Formula Rows**: Row showing percentages and formulas

#### Footer Section (Rows 83-93)
- **KPI Targets**: Performance indicators with 2024 Actual vs 2025 Target
- **Signature Blocks**: Contractor and PDO signature areas

---

## Step 1: Store Template in Database

### Why Store the Template?

Instead of generating Excel from scratch, you'll:
1. Keep the original Excel file as a **template**
2. Store it in Supabase Storage
3. Load it at export time
4. Only update the data cells (preserving all formatting)

### Create Template Storage

#### In Supabase Dashboard:

1. **Create Storage Bucket**:
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('excel-templates', 'excel-templates', false);
   ```

2. **Set Up RLS Policies**:
   ```sql
   -- Allow authenticated users to read templates
   CREATE POLICY "Allow authenticated read"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'excel-templates');
   
   -- Allow admins to upload/update templates
   CREATE POLICY "Allow admin write"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'excel-templates' 
     AND auth.uid() IN (
       SELECT user_id FROM user_role 
       WHERE role_id = (SELECT role_id FROM role WHERE name = 'admin')
     )
   );
   ```

3. **Upload Original Template**:
   - Go to Storage in Supabase Dashboard
   - Navigate to `excel-templates` bucket
   - Upload your `BGIS-HSE-F-044 BGIS site HSE Monitoring Plan 2025.xlsx`
   - Rename it to `hse-monitoring-template-2025.xlsx`

### Track Template Versions

Add to `export_template` table (already in schema):
```sql
INSERT INTO export_template (
  template_id,
  name,
  storage_url,
  version,
  checksum
) VALUES (
  gen_random_uuid(),
  'HSE Monitoring Plan 2025',
  'excel-templates/hse-monitoring-template-2025.xlsx',
  '1.0',
  'sha256-hash-of-file'  -- Calculate this
);
```

---

## Step 2: Excel Library Selection

### Recommended: ExcelJS

**Why ExcelJS?**
- Can **read and modify** existing Excel files (preserves formatting)
- Supports all Excel features (colors, borders, merged cells, formulas)
- Works in Node.js (for Edge Functions or API routes)
- Active maintenance and good documentation

**Installation**:
```bash
npm install exceljs
```

**Alternative Options**:
1. **xlsx (SheetJS)** - Good for reading, limited write formatting
2. **node-xlsx** - Simpler but loses formatting
3. **OpenXML SDK** - If using .NET backend

---

## Step 3: Cell Mapping Strategy

### Define Cell Mappings

Create a mapping configuration that defines where database values go in the Excel template:

#### Mapping Structure

```typescript
// Cell mapping configuration (create this in code or database)
interface CellMapping {
  cellRef: string;           // Excel cell reference (e.g., "F5")
  dataSource: string;        // Database column/field
  kpiId?: string;           // Which KPI this cell belongs to
  periodId?: string;        // Which period (month) this represents
  valueType: 'numeric' | 'text' | 'formula' | 'status';
  keepFormatting: boolean;  // Always true to preserve template formatting
}
```

### Key Mapping Areas

#### 1. Header Information (Dynamic per export)
- **Cell C1-Q1**: Title (keep as is)
- **Cell C2-Q2**: Contractor name (from `org_site` table)
- **Cell C3-Q3**: Contract holder (from configuration)

#### 2. Month Columns (F through Q)
- **Column F**: January 2025 values
- **Column G**: February 2025 values
- **Column H**: March 2025 values
- **Column I**: April 2025 values
- **Column J**: May 2025 values
- **Column K**: June 2025 values
- **Column L**: July 2025 values
- **Column M**: August 2025 values
- **Column N**: September 2025 values
- **Column O**: October 2025 values
- **Column P**: November 2025 values
- **Column Q**: December 2025 values

#### 3. KPI Data Rows
Each KPI occupies a row, with values mapped to columns F-Q based on `kpi_value` table:

**Example Mapping for KPI 1.1 (Row 5)**:
```typescript
const kpi_1_1_mappings = [
  { cellRef: 'F5', kpiCode: '1.1', period: 'Jan-25', column: 'numeric_value' },
  { cellRef: 'G5', kpiCode: '1.1', period: 'Feb-25', column: 'numeric_value' },
  // ... continue for all months
  { cellRef: 'R5', kpiCode: '1.1', column: 'measurement' }  // Measurement column
];
```

#### 4. Formula Cells (Keep formulas, update inputs)
- **Row 81-82**: Percentage and count formulas
- These cells contain formulas like `=M82/25`
- **Strategy**: Don't modify formula cells, only update the cells they reference

#### 5. KPI Summary Section (Rows 83-93)
- **Column B**: KPI names (keep template text)
- **Column C**: "2024 Actual" values (from previous year data if available)
- **Column D**: "2025 Target" values (from `kpi` table target fields)

---

## Step 4: Preserve All Formatting

### What Formatting to Preserve

#### 1. Cell Colors/Fills
**Template Colors**:
- Header rows: Specific blue/gray backgrounds
- Section headers (1, 2, 3, etc.): Dark gray background
- Month columns: Light blue or white alternating
- KPI rows: White or light gray alternating

**How to Preserve**:
```typescript
// ExcelJS automatically preserves colors when reading existing file
// Don't set new fill properties, only update cell values
cell.value = newValue;  // ✅ Correct
// cell.fill = {...};    // ❌ Don't do this - removes template formatting
```

#### 2. Borders
**Template Borders**:
- All cells have borders (thin black lines)
- Header row has thicker borders
- Outer border of data area is bold

**How to Preserve**:
- Read template with borders intact
- Don't modify border properties when updating values

#### 3. Fonts
**Template Fonts**:
- Font family: Calibri or Arial
- Header row: Bold, size 11
- Section headers: Bold, size 10
- Data rows: Regular, size 10
- Colors: Black for text, white for headers with dark background

**How to Preserve**:
- Don't modify font properties
- Template fonts remain intact when updating cell values only

#### 4. Alignment
**Template Alignment**:
- Headers: Center aligned
- Numbers: Right aligned
- Text: Left aligned
- Month columns: Center aligned

**How to Preserve**:
- Don't change alignment properties
- Update only cell values

#### 5. Column Widths
**Template Column Widths** (approximate):
- Column A (`#`): ~6 units
- Column B (`Actions`): ~65 units (widest column)
- Column C-D: ~20 units
- Column E: ~15 units
- Columns F-Q (months): ~8 units each
- Column R: ~15 units

**How to Preserve**:
- Read template with existing widths
- Don't call `column.width = ...`

#### 6. Row Heights
**Template Row Heights**:
- Header rows: ~30 pixels (taller)
- Data rows: ~15-20 pixels
- Section header rows: ~20 pixels

**How to Preserve**:
- Template row heights maintained automatically
- Don't modify `row.height`

#### 7. Merged Cells
**Template Merged Cells**:
- **C1:Q1** - Title row
- **C2:Q2** - Contractor name
- **C3:Q3** - Contract holder
- Various cells in signature section

**How to Preserve**:
- ExcelJS maintains merged cells when reading template
- Don't unmerge or re-merge cells
- When updating merged cell value, update the top-left cell only

#### 8. Number Formats
**Template Number Formats**:
- Integers: `0` (no decimals)
- Decimals: `0.00` (two decimals)
- Percentages: `0%` or `0.00%`
- Text: `@` (text format)

**How to Preserve**:
- Don't change `numFmt` property
- Excel will apply existing format to new values

---

## Step 5: Implementation Architecture

### Export Flow

```
User clicks "Export" 
    ↓
Frontend calls API: POST /api/export/generate
    ↓
API creates export_run record (status: 'pending')
    ↓
Enqueue job to Edge Function or background worker
    ↓
Worker Process:
  1. Fetch template from Supabase Storage
  2. Load template with ExcelJS
  3. Query database for current KPI data
  4. Update only data cells (preserve formatting)
  5. Recalculate formulas
  6. Save to buffer
  7. Upload to Supabase Storage
  8. Update export_run (status: 'completed', file_url)
    ↓
Return download link to user
```

### Code Structure

Create these files in your project:

#### 1. `/src/lib/services/excelTemplateExport.ts`
**Purpose**: Main export logic using template

**Key Functions**:
- `loadTemplate()` - Fetch template from storage
- `updateHeaderSection()` - Update contractor info
- `updateKpiData()` - Populate KPI values
- `updateFooterSection()` - Update KPI summary
- `saveAndUpload()` - Save file and upload

#### 2. `/supabase/functions/generate-excel-export/index.ts`
**Purpose**: Edge Function to handle export processing

**Why Edge Function?**:
- Runs server-side (can access Supabase service key)
- Isolated environment
- Can handle large file processing
- Async operation (doesn't block UI)

#### 3. `/src/app/api/export/generate/route.ts`
**Purpose**: API endpoint to trigger export (alternative to Edge Function)

**Use if**: You prefer Next.js API routes over Edge Functions

---

## Step 6: Data Query Logic

### Fetch All Required Data

Before updating template, fetch all data in optimized queries:

#### Query 1: KPI Values for All Periods
```sql
SELECT 
  k.kpi_code,
  k.name as kpi_name,
  k.action_owner,
  k.action_party,
  k.target_frequency,
  k.measurement,
  s.name as section_name,
  s.section_number,
  p.label as period_label,  -- 'Jan-25', 'Feb-25', etc.
  p.month_number,
  kv.numeric_value,
  kv.text_value,
  kv.status
FROM kpi k
JOIN section s ON k.section_id = s.section_id
LEFT JOIN kpi_value kv ON k.kpi_id = kv.kpi_id
LEFT JOIN kpi_period p ON kv.period_id = p.period_id
WHERE p.period_type = 'month'
  AND p.start_date >= '2025-01-01'
  AND p.start_date < '2026-01-01'
ORDER BY 
  s.section_number,
  k.kpi_code,
  p.month_number;
```

#### Query 2: KPI Targets for Footer
```sql
SELECT 
  kpi_code,
  name,
  target_2024_actual,
  target_2025
FROM kpi_targets
WHERE category IN (
  'Lost time Injury',
  'Total Recordable Cases',
  'Motor Vehicle Incidents',
  -- etc.
)
ORDER BY display_order;
```

### Transform to Cell Updates

Convert query results to cell update operations:

```typescript
interface CellUpdate {
  cellAddress: string;  // e.g., 'F5'
  value: string | number | null;
  skipIfEmpty: boolean;  // Don't overwrite template text if no data
}
```

---

## Step 7: Value Population Strategy

### Rules for Updating Cells

#### Rule 1: Update Data Cells Only
```typescript
// ✅ CORRECT: Update only the value
worksheet.getCell('F5').value = kpiValue;

// ❌ WRONG: Don't recreate the cell
worksheet.getCell('F5').value = kpiValue;
worksheet.getCell('F5').fill = {...};      // Loses template formatting
worksheet.getCell('F5').font = {...};      // Loses template formatting
```

#### Rule 2: Handle Empty Values
```typescript
// If no data for a month, you can either:
// Option A: Leave template value (if template has placeholder)
if (kpiValue !== null) {
  worksheet.getCell('F5').value = kpiValue;
}

// Option B: Set to empty/zero
worksheet.getCell('F5').value = kpiValue ?? 0;

// Option C: Set to 'N/A'
worksheet.getCell('F5').value = kpiValue ?? 'N/A';
```

#### Rule 3: Respect Data Types
```typescript
// Number cells should get numbers
worksheet.getCell('F5').value = Number(kpiValue);  // Not string

// Text cells should get strings
worksheet.getCell('B5').value = String(kpiName);

// Date cells should get Date objects
worksheet.getCell('M5').value = new Date(dateValue);
```

#### Rule 4: Handle Merged Cells
```typescript
// For merged cell C1:Q1, update only the top-left cell (C1)
const mergedCell = worksheet.getCell('C1');
mergedCell.value = '2025 HSE Monitoring Plan';
// Don't try to update Q1 separately
```

#### Rule 5: Preserve Formula Cells
```typescript
// Check if cell has a formula
const cell = worksheet.getCell('M82');
if (cell.formula) {
  // Don't modify formula cells
  // They will recalculate automatically
} else {
  // Update regular cells
  cell.value = newValue;
}
```

---

## Step 8: ExcelJS Implementation

### Load Template and Update

```typescript
import ExcelJS from 'exceljs';

async function generateExport(exportRunId: string) {
  // 1. Load template
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await fetchTemplateFromStorage();
  await workbook.xlsx.load(templateBuffer);
  
  // 2. Get the worksheet
  const worksheet = workbook.getWorksheet('Table 1');
  
  // 3. Update header (if needed)
  updateHeader(worksheet, contractorInfo);
  
  // 4. Update KPI data
  await updateKpiData(worksheet, kpiData);
  
  // 5. Update footer KPIs
  updateFooterKPIs(worksheet, kpiTargets);
  
  // 6. Recalculate formulas (if needed)
  worksheet.getCell('M82').value = { 
    formula: 'M82/25',
    result: null  // Excel will recalculate
  };
  
  // 7. Save to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // 8. Upload to storage
  const fileUrl = await uploadToStorage(buffer, exportRunId);
  
  return fileUrl;
}
```

### Helper Functions

```typescript
function updateHeader(worksheet, contractorInfo) {
  // Update only if contractor info changes
  worksheet.getCell('C2').value = 
    `Contractor Name:${contractorInfo.name}`;
  worksheet.getCell('C3').value = 
    `PDO Contract Holder: ${contractorInfo.contractHolder}`;
}

function updateKpiData(worksheet, kpiData) {
  // Group by KPI and row
  const kpiByRow = groupKpisByRow(kpiData);
  
  kpiByRow.forEach((kpi, rowNumber) => {
    // Update each month column (F through Q)
    const months = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    
    kpi.monthlyValues.forEach((value, index) => {
      const cellAddress = `${months[index]}${rowNumber}`;
      worksheet.getCell(cellAddress).value = value;
    });
  });
}
```

---

## Step 9: Handle Special Cases

### Case 1: N/A Values
Some cells in the template have "N/A" text:
```typescript
// Preserve N/A where it exists in template
if (kpiValue === null && templateValue === 'N/A') {
  // Don't overwrite
  return;
}
```

### Case 2: Multiple Values in One Cell
Some cells might have text like "Photos, Report":
```typescript
// If cell needs comma-separated values
const measurementMethods = ['Photos', 'Report', 'MOM'];
worksheet.getCell('R5').value = measurementMethods.join(', ');
```

### Case 3: Date Formatting
Excel stores dates as numbers:
```typescript
// If you need to display month name
const monthCell = worksheet.getCell('F4');
// Don't change - template has "Jan-25" text
// If you need to calculate, use Date objects in data cells
```

### Case 4: Percentage Cells
```typescript
// Template may have percentage format
// Just provide decimal value, Excel will format
worksheet.getCell('F81').value = 0.97;  // Will display as "97%"
```

### Case 5: Images/Logos
```typescript
// Template has logos in columns A-B
// ExcelJS preserves images when loading template
// Don't add or remove images unless specifically needed
```

---

## Step 10: Testing Strategy

### Test Checklist

Create test cases that verify:

#### Visual Verification
- [ ] Open exported file in Excel
- [ ] Check title row matches template
- [ ] Verify all colors match original
- [ ] Check borders are intact
- [ ] Verify merged cells correct
- [ ] Check column widths match
- [ ] Verify row heights match
- [ ] Check fonts match (family, size, bold)

#### Data Verification
- [ ] All KPI values populated correctly
- [ ] Month columns show correct months
- [ ] Formulas calculate correctly
- [ ] N/A values in correct places
- [ ] No data overwritten accidentally
- [ ] Empty cells handled properly

#### Functional Testing
- [ ] File opens without errors
- [ ] No #VALUE! errors (except template placeholders)
- [ ] Formulas recalculate on open
- [ ] File size reasonable (<5MB typically)
- [ ] Print preview looks correct
- [ ] Can save and re-open file

### Create Test Suite

```typescript
// Test that export matches template
describe('Excel Export Formatting', () => {
  it('should preserve header formatting', async () => {
    const exported = await generateExport(testData);
    const headerCell = exported.getCell('C1');
    
    expect(headerCell.font.bold).toBe(true);
    expect(headerCell.fill.type).toBe('pattern');
    // Check more properties
  });
  
  it('should populate all KPI values', async () => {
    const exported = await generateExport(testData);
    
    testData.forEach(kpi => {
      const cell = exported.getCell(kpi.cellAddress);
      expect(cell.value).toBe(kpi.expectedValue);
    });
  });
});
```

---

## Step 11: Optimization Tips

### Performance Optimization

#### 1. Batch Cell Updates
```typescript
// Instead of updating cells one by one
worksheet.getCell('F5').value = value1;
worksheet.getCell('G5').value = value2;

// Use batch operations
const updates = [
  { cell: 'F5', value: value1 },
  { cell: 'G5', value: value2 }
];

updates.forEach(update => {
  worksheet.getCell(update.cell).value = update.value;
});
```

#### 2. Cache Template
```typescript
// Don't fetch template every time
// Cache it in memory or Redis
const templateCache = new Map();

async function getTemplate() {
  if (!templateCache.has('hse-template')) {
    const buffer = await fetchFromStorage();
    templateCache.set('hse-template', buffer);
  }
  return templateCache.get('hse-template');
}
```

#### 3. Parallel Processing
```typescript
// If exporting multiple files, process in parallel
const exports = await Promise.all(
  siteIds.map(siteId => generateExport(siteId))
);
```

### File Size Optimization

#### 1. Remove Unused Sheets
```typescript
// If template has multiple sheets but you only use one
workbook.removeWorksheet(unusedSheetIndex);
```

#### 2. Optimize Images
- Template images should be optimized before upload
- Use compressed PNG/JPG
- Remove unnecessary images

---

## Step 12: Error Handling

### Common Issues and Solutions

#### Issue 1: File Corruption
**Symptom**: "File is corrupted" error when opening
**Solution**: 
- Ensure you're saving as proper XLSX format
- Don't modify workbook structure (sheets, dimensions)
- Validate template before processing

#### Issue 2: Formula Errors
**Symptom**: #REF! or #VALUE! errors in formulas
**Solution**:
- Don't move cells that formulas reference
- Preserve formula cells exactly
- Recalculate workbook after updates

#### Issue 3: Missing Formatting
**Symptom**: Colors/borders missing
**Solution**:
- Load template with `await workbook.xlsx.load()` not `.read()`
- Don't reassign formatting properties
- Update values only, not style objects

#### Issue 4: Performance Issues
**Symptom**: Export takes too long
**Solution**:
- Cache template in memory
- Batch database queries
- Use background processing
- Implement timeout handling

---

## Step 13: User Experience

### Frontend Implementation

#### Export Button
```typescript
// In TemplateManager or admin panel
<Button 
  onClick={handleExport}
  disabled={exporting}
>
  {exporting ? 'Generating...' : 'Export to Excel'}
</Button>
```

#### Progress Indicator
```typescript
// Show export progress
const [exportProgress, setExportProgress] = useState({
  status: 'idle',  // idle, processing, completed, failed
  progress: 0,
  message: ''
});

// Update UI based on status
{exportProgress.status === 'processing' && (
  <Progress value={exportProgress.progress} />
)}
```

#### Download Handling
```typescript
// When export completes
const handleDownload = (fileUrl: string) => {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `HSE-Monitoring-Plan-${new Date().toISOString()}.xlsx`;
  link.click();
};
```

---

## Step 14: Configuration Management

### Template Metadata

Store template configuration in database:

```typescript
interface TemplateConfig {
  templateId: string;
  name: string;
  version: string;
  cellMappings: {
    headerSection: {
      title: string;           // C1
      contractor: string;       // C2
      contractHolder: string;   // C3
    };
    dataSection: {
      startRow: number;         // 5
      endRow: number;           // 82
      columns: {
        kpiCode: string;        // A
        description: string;    // B
        owner: string;          // C
        party: string;          // D
        frequency: string;      // E
        months: string[];       // F-Q
        measurement: string;    // R
      };
    };
    footerSection: {
      startRow: number;         // 83
      kpiRows: Map<string, number>;  // Map KPI name to row
    };
  };
}
```

### Dynamic Configuration

Allow admins to update template mappings without code changes:
- Store mappings in `template_config` table
- UI to update cell references
- Validate mappings before saving

---

## Quick Implementation Checklist

- [ ] Install ExcelJS: `npm install exceljs`
- [ ] Create `excel-templates` storage bucket in Supabase
- [ ] Upload original template file to storage
- [ ] Create cell mapping configuration
- [ ] Implement `excelTemplateExport.ts` service
- [ ] Create API endpoint or Edge Function for export
- [ ] Test with sample data
- [ ] Verify formatting matches original exactly
- [ ] Add export button to UI
- [ ] Implement progress tracking
- [ ] Add error handling and logging
- [ ] Test with production data
- [ ] Optimize performance (caching, batching)
- [ ] Document any template-specific quirks

---

## Maintenance

### When Template Changes

If you need to update the template (new rows, changed formatting):

1. Update physical Excel file
2. Upload new version to storage
3. Update version number in `export_template` table
4. Update cell mapping configuration if structure changed
5. Test exports thoroughly
6. Deploy changes

### Version Control

Keep template versions:
- `hse-template-v1.0.xlsx`
- `hse-template-v1.1.xlsx`
- etc.

Allow users to export with specific template version if needed.

---

This approach ensures your exported Excel files are **pixel-perfect replicas** of the original template with live data from the database!
