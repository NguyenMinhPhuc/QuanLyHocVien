USE [CenterManagement]
GO

/****** Migration: Create Receipts table and stored procedure to create receipts ******/

IF OBJECT_ID('dbo.Receipts', 'U') IS NULL
BEGIN
  CREATE TABLE Receipts
  (
    id INT IDENTITY(1,1) PRIMARY KEY,
    payment_id INT NOT NULL FOREIGN KEY REFERENCES Payments(id),
    enrollment_id INT NULL FOREIGN KEY REFERENCES Enrollments(id),
    receipt_number NVARCHAR(100) NOT NULL,
    data NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE()
  );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_receipts_create
  @payment_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @enrollment_id INT, @amount DECIMAL(12,2), @paid_at DATETIME, @method NVARCHAR(50), @note NVARCHAR(500);
  SELECT @enrollment_id = enrollment_id, @amount = amount, @paid_at = paid_at, @method = method, @note = note
  FROM Payments
  WHERE id = @payment_id;

  DECLARE @student_name NVARCHAR(200) = NULL, @class_name NVARCHAR(200) = NULL;
  IF @enrollment_id IS NOT NULL
  BEGIN
    SELECT @student_name = s.name, @class_name = ISNULL(c.name, 'Class ' + CAST(cl.id AS NVARCHAR(20)))
    FROM Enrollments e
      LEFT JOIN Students s ON s.id = e.student_id
      LEFT JOIN Classes cl ON cl.id = e.class_id
      LEFT JOIN Courses c ON c.id = cl.course_id
    WHERE e.id = @enrollment_id;
  END

  DECLARE @rn NVARCHAR(100) = CONCAT('RCPT-', FORMAT(GETDATE(),'yyyyMMddHHmmss'), '-', LEFT(NEWID(),8));
  DECLARE @json NVARCHAR(MAX) = (
    SELECT
    @payment_id AS payment_id,
    @enrollment_id AS enrollment_id,
    @student_name AS student_name,
    @class_name AS class_name,
    @amount AS amount,
    @method AS method,
    @paid_at AS paid_at,
    @note AS note
  FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
  );

  INSERT INTO Receipts
    (payment_id, enrollment_id, receipt_number, data)
  OUTPUT
  INSERTED.*
  VALUES
    (@payment_id, @enrollment_id, @rn, @json);
END
GO
