-- Seed data for HSE Monitoring System

-- First, insert periods for 2025
INSERT INTO kpi_period (period_type, start_date, end_date, label, year, month) VALUES
('monthly', '2025-01-01', '2025-01-31', 'Jan-25', 2025, 1),
('monthly', '2025-02-01', '2025-02-28', 'Feb-25', 2025, 2),
('monthly', '2025-03-01', '2025-03-31', 'Mar-25', 2025, 3),
('monthly', '2025-04-01', '2025-04-30', 'Apr-25', 2025, 4),
('monthly', '2025-05-01', '2025-05-31', 'May-25', 2025, 5),
('monthly', '2025-06-01', '2025-06-30', 'Jun-25', 2025, 6),
('monthly', '2025-07-01', '2025-07-31', 'Jul-25', 2025, 7),
('monthly', '2025-08-01', '2025-08-31', 'Aug-25', 2025, 8),
('monthly', '2025-09-01', '2025-09-30', 'Sep-25', 2025, 9),
('monthly', '2025-10-01', '2025-10-31', 'Oct-25', 2025, 10),
('monthly', '2025-11-01', '2025-11-30', 'Nov-25', 2025, 11),
('monthly', '2025-12-01', '2025-12-31', 'Dec-25', 2025, 12);

-- Create default roles
INSERT INTO role (name, description, permissions) VALUES
('admin', 'Full system access', '{"all": true}'),
('editor', 'Can edit KPIs and values', '{"read": true, "write": true}'),
('viewer', 'Read-only access', '{"read": true}'),
('auditor', 'Can view audit trails and reports', '{"read": true, "audit": true}');

-- Insert main site
INSERT INTO org_site (name, code, description) VALUES
('PDO Nimr', 'NIMR', 'Black Gold Integrated Solution PDO Nimr Site');

-- Get site_id for reference
-- Insert sections
INSERT INTO section (site_id, name, code, order_idx, description) VALUES
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Safety Leadership', 'SL', 1, 'Senior management involvement in safety leadership and site visits'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Worker Welfare', 'WW', 2, 'Worker welfare initiatives and gap analysis'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Contractor HSE Management', 'CHM', 3, 'HSE performance reviews and compliance monitoring'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Road Safety', 'RS', 4, 'IVMS monitoring and driver forums'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Process Safety', 'PS', 5, 'AIPSM training and incident reporting'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Hazards and Risks Management', 'HRM', 6, 'Hazard hunts, risk registers, and occupational health'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Learner Organization', 'LO', 7, 'Incident analysis and learning from failures'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Assurance', 'AS', 8, 'Audits, inspections, and assurance activities'),
((SELECT site_id FROM org_site WHERE code = 'NIMR'), 'Competency and Resources', 'CR', 9, 'Training, competency assessments, and awareness programs');

-- Insert KPIs for Safety Leadership
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'SL'), '1.1', 'Senior Management Site Visit', 'Sr. Management to conduct a site visit covering site inspection of critical activities, Hazard Hunt, Boots on the Ground, Site HSE meeting with all the Staff, meeting with drivers and witness to TBT.', 'Quarterly', 'Photos, Report'),
((SELECT section_id FROM section WHERE code = 'SL'), '1.2', 'Lead Safety Day', 'Lead Safety Day by covering everyone', 'Annual', 'Photos, Record'),
((SELECT section_id FROM section WHERE code = 'SL'), '1.3', 'Celebrate Milestone Achievements', 'Celebrate Milestone Achievements / Awards. This includes: LTI-free once a year and Best Nearmiss report on a monthly', 'Monthly', 'Photos, Record'),
((SELECT section_id FROM section WHERE code = 'SL'), '1.4', 'Weekly HSE Meeting', 'Weekly HSE Meeting(Gate meeting)', 'Weekly', 'MOM, Photos'),
((SELECT section_id FROM section WHERE code = 'SL'), '1.5', 'PDO Safety Standown', 'PDO Safety Standown as needed.', 'As required', 'MOM, Reflections, Photos');

-- Insert KPIs for Worker Welfare
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'WW'), '2.1', 'Worker Welfare Gap Analysis', 'Fill the Worker Welfare Gap Analysis form (to be provided by PDO WW Team)', 'Annual', 'Filled Form'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.2', 'Monthly Review of Worker Welfare', 'Monthly Review of worker welfare gap closure progress involving CH and PDO WW Lead.', 'Monthly', 'MoM'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.4', 'Worker Welfare Committee Meeting', 'A monthly Worker Welfare Committee meeting where it address the related issues and track them in ATR.', 'Monthly', 'MoM, Photos'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.5', 'Worker Welfare Calendar', 'Create, implement and maintain full year calendar of the worker welfare activities. Such as cultural festival, sport, awareness and training, mental', 'Annual', 'Calendar'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.5.1', 'Drugs/Alcohol Awareness', 'Drugs,Alcohol and First Aid addiction consequences Awareness', 'Annual', 'Photos'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.5.2', 'Sport Competition Activities', 'Sport computation or challenge activities', 'Annual', 'Photos'),
((SELECT section_id FROM section WHERE code = 'WW'), '2.6', 'Grievance Mechanism Tracker', 'Create or develop and maintain a tracker for grievance mechanism to ensure worker welfare issues and concerns are addressed.', 'Monthly Review', 'Tracker');

-- Insert KPIs for Contractor HSE Management
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'CHM'), '3.1', 'HSE Monitoring Plan Compliance', 'Review with CH the compliance of HSE Monitoring Plan on monthly basis.', 'Monthly', 'Monitoring Plan compliance report'),
((SELECT section_id FROM section WHERE code = 'CHM'), '3.2', 'Subcontractors HSE Performance', 'Subcontractors HSE performance reviews and audit shall be carried out in accordance with PR-1171 Appendix F as a minimum.', 'Every 6 Months', 'Report'),
((SELECT section_id FROM section WHERE code = 'CHM'), '3.3', 'Self Assessment HSE Performance', 'Conduct self assessment for HSE Performance Audit and sustain gap closure from this audit (Green Banding).', 'Self Assessment 1st Quarter Gap Closure - Monthly (100%)', 'Report');

-- Insert KPIs for Road Safety
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'RS'), '4.1', 'IVMS Report Review', 'Review of IVMS Report and apply consequence management to non-conformance (Whenever Violation Occurred).', 'Monthly', 'Record'),
((SELECT section_id FROM section WHERE code = 'RS'), '4.2', 'IVMS Credentials Submission', 'Ensure to submit the IVMS credentials for all vehicles utilised under the Contract, including subcontractors and call offs, and update any change on vehicles (additon or remove)', 'Quarterly', 'Email'),
((SELECT section_id FROM section WHERE code = 'RS'), '4.3', 'Driver Forums', 'Conduct In house drivers forums with all the drivers to influence in reducing the violations related to driving. And share learnings.', 'Quarterly', 'Photos & Record');

-- Insert KPIs for Process Safety
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'PS'), '5.1', 'AIPSM Training', 'Complete Mandatory AIPSM training (eg, PSFs, Wave1 and Wave2)', 'Continues', 'Training Certificate'),
((SELECT section_id FROM section WHERE code = 'PS'), '5.2', 'Tier 3 & 4 Incident Reporting', 'Enhance reporting Tier 3 & Tier 4 incidents among workforce by conducting awareness sessions', 'when it happened', 'Photos, Attendance Sheet');

-- Insert KPIs for Hazards and Risks Management
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'HRM'), '6.1', 'Monthly Hazard Hunt', 'Conduct Monthly Hazard Hunt', 'Monthly', 'Hazard Hunts Records'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.2', 'Risk Register Review', 'Review and revise Risk Register if required as per LFIs, HSE Alerts, Incidents, events etc. And ensure the format as per PR-1171 Appendix D.', 'Continues at it comes, Once a Year Review.', 'Risk Register'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.3.1', 'HRA Compliance', 'Ensure HRA is approved by MCOH and implemented with all the remedial measures.', 'Monthly', 'Approved HRA & Compliance Report'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.3.2', 'PDO Medical Compliance', 'Monitor and ensure that all the personnel undergone PDO medical (FTW) as per SP1230, SP 1231 where applicable.', 'Monthly', 'Approved HRA & Compliance'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.4.1', 'Environmental Compliance', 'Compliance of Legal/Statutory requirement. (e.g. Environmental MECA regulations & Permits, PDO Environmental (SP-2194).', 'Every 6 Months - 100%', 'Environment Permit'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.5.1', 'Fire Evacuation Drill', 'Fire Evacuation Drill', 'Semiannual', 'Drill Reports'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.5.2', 'H2S Release Drill', 'H2S Release Drill', 'Semiannual', 'Drill Reports'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.5.3', 'Chemical Spillage Drill', 'Chemical Spillage Drill', 'Semiannual', 'Drill Reports'),
((SELECT section_id FROM section WHERE code = 'HRM'), '6.5.4', 'Man Lost and Vehicle Breakdown Drill', 'Man lost Drill and Vehicle Breakdown Drill', 'Annual', 'Drill Reports');

-- Insert KPIs for Learner Organization
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'LO'), '7.1', 'Deep Dive Analysis', 'Deep dive of all incidents, NM, Observations, BBS/ HPI Observations , audit, etc. and develop pattern and focus areas.', 'Quarterly', 'Report for Site Level'),
((SELECT section_id FROM section WHERE code = 'LO'), '7.2', 'LFI Communication', 'Ensure all LFIs are communicated and learnings are implemented.', 'Continous', 'Attendance Sheets/MOM');

-- Insert KPIs for Assurance
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'AS'), '8.1', 'Action Closure', 'Assure that all actions, open incidents, LSR and non-conformances are closed within the time bound.', 'Monthly', 'Action tracker'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.1', 'SP2194 Environmental Audit', 'SP2194 Environmental control', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.2', 'CP-122 Life Saving Rules Audit', 'CP-122 Life Saving Rules', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.3', 'PR-1065 Emergency Response Audit', 'PR-1065 Emergency Response', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.4', 'PR-1171 Contract HSE Management Audit', 'PR-1171 Contract HSE Management', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.5', 'PR1980 HSE Competency Audit', 'PR1980 HSE competency', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.6', 'SP-1194 Chemical HSE Management Audit', 'SP-1194 Chemical HSE Management', 'Semiannual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.7', 'SP2000 Road Safety Audit', 'SP2000 Road Safety', 'Semiannual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.8', 'SP-1257 Work at Height Audit', 'SP-1257 Work at Height & Access', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.2.9', 'SP-2273 Lift Planning Audit', 'SP-2273 Lift Planning and Execution', 'Annual', 'Audit Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.1', 'Yard/Workshop Inspection', 'Yard, workshop, and store Inspection (including subcontractors)', 'Quarterly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.2', 'Vehicle Inspection', 'LV and HV Vehicle Inspection', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.3', 'Lifting Equipment Inspection', 'Lifting Equipment: Lifting Tools and Tackles, Mobile Crane, HIAB, MEWP / Bucket Truck Inspections', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.5', 'Full Body Harness Inspection', 'Full body harness Inspection', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.6', 'Emergency Equipment Inspection', 'Emergency / Fire Equipment Inspection (Eg: Fire Extinguisher, Smoke Detectors, Manual Fire Alarm, Fire Alarm etc.)', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.7', 'First Aid Box Inspection', 'First Aid Box Inspection', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.8', 'Hand & Power Tools Inspection', 'Hand & Power tools Inspection (Eg: Drilling Machinss, Grinding Machines, Hammers, Crimping Machine, Spanners, etc.)', 'Monthly', 'Inspection Report'),
((SELECT section_id FROM section WHERE code = 'AS'), '8.3.9', 'Office Inspection', 'Office inspection', 'Monthly', 'Inspection Report');

-- Insert KPIs for Competency and Resources
INSERT INTO kpi (section_id, code, name, description, target_formula, unit) VALUES
((SELECT section_id FROM section WHERE code = 'CR'), '9.1', 'HSE Competence Assessment', 'Complete HSE Competence assessment for HSE Critical positions (only by PDO approved assessors)', '100% of Critical Position', 'Assessment form and development plan'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.2', 'Mandatory HSE Training', 'Ensure all personnel completed mandatory HSE training as per SP1157 and HSE training matrix.', 'Ongoing', 'Training Matrix'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.3', 'HSE Induction', 'In house HSE induction of new & transferred employees to provide site specific HSE information', 'As needed', 'Induction Register'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.1', 'Road Safety Awareness', 'Road Safety awareness (All personnel driving vehicles and / or equipment)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.2', 'Lifting Awareness', 'Lifting awareness (All personnel involved in lifting activities)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.3', 'Ramadan Safety Awareness', 'Ramadan Safety awareness Training (All Employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.5', 'Heat Stress Awareness', 'Heat Stress awareness (All employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.6', 'Emergency Response Awareness', 'Emergency Response awareness (All employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.7', 'Incident Reporting Awareness', 'Incident,Near misss reporting awareness (All employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.9', 'Mental Health Awareness', 'Mental Health and Wellbeing awareness (All employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.10', 'Occupational Health Awareness', 'Awareness on Occupational Health Hazards and Risks like Manual Handling, Noise, Vibration etc. (All employees)', 'Annual', 'Photos & Record'),
((SELECT section_id FROM section WHERE code = 'CR'), '9.4.11', 'Environmental Protection Awareness', 'Environmental protection & Hazards in chemical handling awareness (All employees)', 'Annual', 'Photos & Record');

-- Create a demo user
INSERT INTO app_user (email, display_name, department) VALUES
('admin@bgis.com', 'System Administrator', 'HSE Department'),
('hse.manager@bgis.com', 'HSE Manager', 'HSE Department'),
('contract.manager@bgis.com', 'Contract Manager', 'Operations');

-- Assign roles to users
INSERT INTO user_role (user_id, role_id) VALUES
((SELECT user_id FROM app_user WHERE email = 'admin@bgis.com'), (SELECT role_id FROM role WHERE name = 'admin')),
((SELECT user_id FROM app_user WHERE email = 'hse.manager@bgis.com'), (SELECT role_id FROM role WHERE name = 'editor')),
((SELECT user_id FROM app_user WHERE email = 'contract.manager@bgis.com'), (SELECT role_id FROM role WHERE name = 'editor'));

-- Insert some sample KPI values for demo
DO $$
DECLARE
    kpi_record RECORD;
    period_record RECORD;
    random_status kpi_status;
    random_value INTEGER;
    status_options kpi_status[] := ARRAY['not_started', 'in_progress', 'done', 'blocked'];
BEGIN
    FOR kpi_record IN SELECT kpi_id FROM kpi LOOP
        FOR period_record IN SELECT period_id FROM kpi_period WHERE year = 2025 AND month <= 9 LOOP
            -- Generate random status and value for demo
            random_status := status_options[1 + (random() * 3)::int];
            random_value := CASE 
                WHEN random() < 0.7 THEN 1  -- 70% chance of having a value
                WHEN random() < 0.9 THEN (random() * 10)::int  -- 20% chance of random number
                ELSE 0  -- 10% chance of 0
            END;
            
            INSERT INTO kpi_value (kpi_id, period_id, status, numeric_value, text_value)
            VALUES (
                kpi_record.kpi_id,
                period_record.period_id,
                random_status,
                CASE WHEN random_value > 0 THEN random_value ELSE NULL END,
                CASE WHEN random_value > 0 THEN random_value::text ELSE NULL END
            );
        END LOOP;
    END LOOP;
END $$;
