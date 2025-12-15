-- Migration: add tuition_amount and discount_percent to Courses and expose them via SPs
SET NOCOUNT ON;
GO

-- 1) add columns to Courses if they don't exist
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'tuition_amount' AND Object_ID = Object_ID(N'dbo.Courses'))
BEGIN
  ALTER TABLE dbo.Courses ADD tuition_amount DECIMAL(18,2) NOT NULL DEFAULT(0);
END
GO

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'discount_percent' AND Object_ID = Object_ID(N'dbo.Courses'))
BEGIN
  ALTER TABLE dbo.Courses ADD discount_percent DECIMAL(5,2) NOT NULL DEFAULT(0);
END
GO

-- 2) update stored procedures for courses to include the new fields
CREATE OR ALTER PROCEDURE dbo.sp_courses_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Courses
  ORDER BY id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_courses_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Courses
  WHERE id = @id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_courses_create
  @name NVARCHAR(200),
  @description NVARCHAR(MAX) = NULL,
  @level NVARCHAR(50) = NULL,
  @sessions INT = 0,
  @status NVARCHAR(50) = 'active',
  @tuition_amount DECIMAL(18,2) = 0,
  @discount_percent DECIMAL(5,2) = 0
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Courses
    (name, description, level, sessions, status, tuition_amount, discount_percent)
  OUTPUT
  INSERTED.*
  VALUES
    (@name, @description, @level, @sessions, @status, @tuition_amount, @discount_percent);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_courses_update
  @id INT,
  @name NVARCHAR(200) = NULL,
  @description NVARCHAR(MAX) = NULL,
  @level NVARCHAR(50) = NULL,
  @sessions INT = NULL,
  @status NVARCHAR(50) = NULL,
  @tuition_amount DECIMAL(18,2) = NULL,
  @discount_percent DECIMAL(5,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Courses
  SET
    name = COALESCE(@name, name),
    description = COALESCE(@description, description),
    level = COALESCE(@level, level),
    sessions = COALESCE(@sessions, sessions),
    status = COALESCE(@status, status),
    tuition_amount = COALESCE(@tuition_amount, tuition_amount),
    discount_percent = COALESCE(@discount_percent, discount_percent)
  WHERE id = @id;
  SELECT *
  FROM Courses
  WHERE id = @id;
END
GO

PRINT 'Migration 2025-12-12_add_course_tuition_discount.sql applied.';
