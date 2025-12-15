USE [CenterManagement]
GO

/****** Migration: Create Settings table (key/value) ******/

IF OBJECT_ID('dbo.AppSettings', 'U') IS NULL
BEGIN
  CREATE TABLE AppSettings
  (
    [key] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX) NULL
  );
END
GO

-- Insert defaults for receipt header
IF NOT EXISTS (SELECT 1 FROM AppSettings WHERE [key] = 'receipt_logo_url')
  INSERT INTO AppSettings([key],[value]) VALUES('receipt_logo_url', NULL);
IF NOT EXISTS (SELECT 1 FROM AppSettings WHERE [key] = 'receipt_center_phone')
  INSERT INTO AppSettings([key],[value]) VALUES('receipt_center_phone', NULL);
GO
