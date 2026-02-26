-- Add Rankedin league columns to teams table
-- Run this on Azure SQL to enable league functionality

ALTER TABLE teams ADD rankedin_url NVARCHAR(500) NULL;
ALTER TABLE teams ADD rankedin_team_name NVARCHAR(100) NULL;
ALTER TABLE teams ADD league_data NVARCHAR(MAX) NULL;
ALTER TABLE teams ADD league_updated_at DATETIME NULL;
