USE [CenterManagement]
GO

/****** Migration: Add Enrollments and Payments for per-class student management ******/

-- Enrollments represent a student's enrollment in a class and carry registration date, status, assigned teacher override, and outstanding balance.
IF OBJECT_ID('dbo.Enrollments', 'U') IS NULL
BEGIN
  CREATE TABLE Enrollments
  (
    id INT IDENTITY(1,1) PRIMARY KEY,
    class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
    student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
    assigned_teacher_id INT NULL FOREIGN KEY REFERENCES Teachers(id),
    registration_date DATE NULL,
    status NVARCHAR(50) DEFAULT 'active',
    -- active, reserved, withdrawn
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE()
  );
END
GO

-- ensure a student cannot be enrolled into the same class twice
IF NOT EXISTS (SELECT 1
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.Enrollments') AND is_unique = 1 AND name = 'UQ_Enrollments_ClassStudent')
BEGIN
  ALTER TABLE Enrollments ADD CONSTRAINT UQ_Enrollments_ClassStudent UNIQUE (class_id, student_id);
END
GO

IF OBJECT_ID('dbo.Payments', 'U') IS NULL
BEGIN
  CREATE TABLE Payments
  (
    id INT IDENTITY(1,1) PRIMARY KEY,
    enrollment_id INT NOT NULL FOREIGN KEY REFERENCES Enrollments(id),
    amount DECIMAL(12,2) NOT NULL,
    paid_at DATETIME DEFAULT GETDATE(),
    method NVARCHAR(50) NULL,
    note NVARCHAR(500) NULL
  );
END
GO

-- Stored procedures for Enrollments
CREATE OR ALTER PROCEDURE dbo.sp_enrollments_get_by_class
  @class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT e.*, s.name AS student_name, s.phone AS student_phone, s.email AS student_email, t.name AS assigned_teacher_name
  FROM Enrollments e
    INNER JOIN Students s ON s.id = e.student_id
    LEFT JOIN Teachers t ON t.id = e.assigned_teacher_id
  WHERE e.class_id = @class_id
  ORDER BY e.created_at DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_enrollments_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT e.*, s.name AS student_name, s.phone AS student_phone, s.email AS student_email, t.name AS assigned_teacher_name
  FROM Enrollments e
    INNER JOIN Students s ON s.id = e.student_id
    LEFT JOIN Teachers t ON t.id = e.assigned_teacher_id
  WHERE e.id = @id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_enrollments_create
  @class_id INT,
  @student_id INT,
  @assigned_teacher_id INT = NULL,
  @registration_date DATE = NULL,
  @status NVARCHAR(50) = 'active',
  @outstanding_balance DECIMAL(12,2) = 0,
  @notes NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  -- if an enrollment for this student+class already exists, return it instead of inserting a duplicate
  IF EXISTS (SELECT 1
  FROM Enrollments
  WHERE class_id = @class_id AND student_id = @student_id)
  BEGIN
    SELECT *
    FROM Enrollments
    WHERE class_id = @class_id AND student_id = @student_id;
    RETURN;
  END
  INSERT INTO Enrollments
    (class_id, student_id, assigned_teacher_id, registration_date, status, outstanding_balance, notes)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @student_id, @assigned_teacher_id, @registration_date, @status, @outstanding_balance, @notes);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_enrollments_update
  @id INT,
  @assigned_teacher_id INT = NULL,
  @registration_date DATE = NULL,
  @status NVARCHAR(50) = NULL,
  @outstanding_balance DECIMAL(12,2) = NULL,
  @notes NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Enrollments
  SET
    assigned_teacher_id = COALESCE(@assigned_teacher_id, assigned_teacher_id),
    registration_date = COALESCE(@registration_date, registration_date),
    status = COALESCE(@status, status),
    outstanding_balance = COALESCE(@outstanding_balance, outstanding_balance),
    notes = COALESCE(@notes, notes)
  WHERE id = @id;
  SELECT *
  FROM Enrollments
  WHERE id = @id;
END
GO

-- Transfer enrollment to a different class
CREATE OR ALTER PROCEDURE dbo.sp_enrollments_transfer
  @id INT,
  @new_class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Enrollments SET class_id = @new_class_id WHERE id = @id;
  SELECT *
  FROM Enrollments
  WHERE id = @id;
END
GO

-- Stored procedures for Payments
CREATE OR ALTER PROCEDURE dbo.sp_payments_add
  @enrollment_id INT,
  @amount DECIMAL(12,2),
  @method NVARCHAR(50) = NULL,
  @note NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Payments
    (enrollment_id, amount, method, note)
  OUTPUT
  INSERTED.*
  VALUES
    (@enrollment_id, @amount, @method, @note);
  -- adjust outstanding balance
  UPDATE Enrollments SET outstanding_balance = outstanding_balance - @amount WHERE id = @enrollment_id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_payments_get_by_enrollment
  @enrollment_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Payments
  WHERE enrollment_id = @enrollment_id
  ORDER BY paid_at DESC;
END
GO
