# Excel Template Upload Instructions

## Overview

The HSE Monitoring System uses a template-based Excel export that preserves all formatting from your original Excel file. This guide explains how to upload your template.

## Prerequisites

1. Your original Excel file: `BGIS-HSE-F-044 BGIS site HSE Monitoring Plan 2025.xlsx`
2. Admin access to the HSE Monitoring System
3. Supabase project with storage enabled

## Step 1: Create Storage Bucket

Run this SQL script in your Supabase SQL Editor:

```bash
# Navigate to Supabase dashboard > SQL Editor
# Run the script: scripts/create-excel-template-bucket.sql
```

Or manually execute:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-templates', 'excel-templates', false)
ON CONFLICT (id) DO NOTHING;
```

## Step 2: Upload Template via Supabase Dashboard

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click on the `excel-templates` bucket
4. Click **Upload file** button
5. Select your Excel file: `BGIS-HSE-F-044 BGIS site HSE Monitoring Plan 2025.xlsx`
6. Rename it to: `hse-monitoring-template-2025.xlsx`
7. Click **Upload**

### Option B: Via Application (Coming Soon)

In the TemplateManager component, we'll add an upload interface for admins.

## Step 3: Verify Upload

1. In Supabase Storage, you should see the file listed
2. File path should be: `excel-templates/hse-monitoring-template-2025.xlsx`
3. Size should be approximately the same as your original file

## Step 4: Test Export

1. Log into the HSE Monitoring System as admin
2. Navigate to the Templates section
3. Click "Export to Excel" button
4. The system will:
   - Load your template from storage
   - Populate it with current KPI data
   - Download the file with all original formatting preserved

## What Gets Preserved?

When using the template, the export preserves:

✅ All cell colors and fills
✅ All borders (thin, thick, etc.)
✅ All fonts (family, size, bold, colors)
✅ All alignment (center, left, right)
✅ All column widths
✅ All row heights
✅ All merged cells
✅ All number formats
✅ All formulas (they will recalculate)

## What Gets Updated?

Only the cell VALUES are updated with live data:

- KPI codes and names (Column A, B)
- Action owners (Column C)
- Target/Frequency (Column E)
- Monthly values (Columns F-Q for Jan-Dec)
- Measurement methods (Column R)

## Troubleshooting

### Template Not Found

If export shows "Template not found", the system will create a basic template automatically. To use your custom template:

1. Check the file exists in Supabase Storage under `excel-templates/hse-monitoring-template-2025.xlsx`
2. Check the file name matches exactly (case-sensitive)
3. Check bucket permissions allow authenticated users to read

### Export Not Working

1. Open browser console (F12) to see error messages
2. Check Supabase connection is working
3. Verify you have KPI data in the database
4. Try refreshing the page and exporting again

### Formatting Lost

If formatting is missing:

1. Ensure you're using the template-based export (not the old basic export)
2. Re-upload the template file
3. Clear browser cache and try again

## Template Versioning

To manage multiple template versions:

1. Name templates with version numbers:
   - `hse-monitoring-template-2025-v1.xlsx`
   - `hse-monitoring-template-2025-v2.xlsx`
   
2. Update the `TEMPLATE_NAME` constant in `src/lib/services/excelExport.ts` to switch versions

## Security Notes

- Template files are stored in a private bucket (not publicly accessible)
- Only authenticated users can download templates
- Only admins can upload/update templates
- Templates are cached for better performance

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection
3. Ensure you have proper permissions
4. Contact system administrator

---

**Template File Location**: `supabase/storage/excel-templates/hse-monitoring-template-2025.xlsx`  
**Export Service**: `src/lib/services/excelExport.ts`  
**Storage Bucket Setup**: `scripts/create-excel-template-bucket.sql`
