-- Migration: create Files table for encrypted file storage
IF OBJECT_ID('dbo.Files', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Files
  (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    mime_type NVARCHAR(100) NOT NULL,
    data VARBINARY(MAX) NOT NULL,
    iv VARBINARY(16) NOT NULL,
    auth_tag VARBINARY(16) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
  );
END
