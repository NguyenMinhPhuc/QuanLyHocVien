-- Migration: Update stored procedures for classes/enrollments/classstudents
-- Adds reserved_count to classes listing, makes enrollment create idempotent,
-- and provides a transactional transfer SP that keeps ClassStudents/Enrollments in sync.

SET NOCOUNT ON;
go
-- 1) sp_classes_get_all: return reserved_count
CREATE OR ALTER PROCEDURE sp_classes_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT c.*, co.name, t.name, ISNULL(rs.reserved_count, 0) AS reserved_count
  , ISNULL((SELECT COUNT([student_id])
    FROM [dbo].[ClassStudents] cs
    WHERE c.id=cs.class_id),0) AS students
  FROM Classes c
    LEFT JOIN dbo.Courses co ON co.id = c.course_id
    LEFT JOIN dbo.Teachers t ON t.id=c.teacher_id
    LEFT JOIN (
    SELECT class_id, COUNT(*) AS reserved_count
    FROM [dbo].[Enrollments]
    WHERE LOWER(ISNULL(status, '')) = 'reserved'
    GROUP BY class_id
  ) rs ON rs.class_id = c.id
  ORDER BY c.id;
END
GO

-- 2) sp_class_students_add: idempotent add (insert if not exists, else update status/enrolled_at)
CREATE OR ALTER PROCEDURE sp_class_students_add
  @class_id INT,
  @student_id INT,
  @status NVARCHAR(50) = 'active',
  @enrolled_at DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    IF EXISTS (SELECT 1
  FROM ClassStudents
  WHERE class_id = @class_id AND student_id = @student_id)
    BEGIN
    -- update status/enrolled_at if provided
    UPDATE ClassStudents
      SET status = @status,
          enrolled_at = COALESCE(@enrolled_at, enrolled_at)
      WHERE class_id = @class_id AND student_id = @student_id;
    SELECT *
    FROM ClassStudents
    WHERE class_id = @class_id AND student_id = @student_id;
    RETURN;
  END

    INSERT INTO ClassStudents
    (class_id, student_id, status, enrolled_at)
  VALUES
    (@class_id, @student_id, @status, @enrolled_at);

    SELECT *
  FROM ClassStudents
  WHERE id = SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    DECLARE @errMsg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('sp_class_students_add error: %s', 16, 1, @errMsg);
    RETURN;
  END CATCH
END
GO

-- 3) sp_enrollments_create: idempotent create (returns existing if present)
CREATE OR ALTER PROCEDURE sp_enrollments_create
  @class_id INT,
  @student_id INT,
  @assigned_teacher_id INT = NULL,
  @registration_date DATETIME = NULL,
  @status NVARCHAR(50) = 'active',
  @outstanding_balance DECIMAL(18,2) = 0,
  @notes NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    DECLARE @existingId INT;
    SELECT @existingId = id
  FROM Enrollments
  WHERE class_id = @class_id AND student_id = @student_id;
    IF @existingId IS NOT NULL
    BEGIN
    SELECT *
    FROM Enrollments
    WHERE id = @existingId;
    RETURN;
  END

    INSERT INTO Enrollments
    (class_id, student_id, assigned_teacher_id, registration_date, status, outstanding_balance, notes)
  VALUES
    (@class_id, @student_id, @assigned_teacher_id, @registration_date, @status, @outstanding_balance, @notes);

    DECLARE @newId INT = SCOPE_IDENTITY();
    SELECT *
  FROM Enrollments
  WHERE id = @newId;
  END TRY
  BEGIN CATCH
    DECLARE @err NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('sp_enrollments_create error: %s', 16, 1, @err);
    RETURN;
  END CATCH
END
GO

-- 4) sp_enrollments_transfer: transactional transfer (update enrollment and sync ClassStudents)
CREATE OR ALTER PROCEDURE sp_enrollments_transfer
  @id INT,
  @new_class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;

    -- get existing enrollment
    DECLARE @student_id INT, @old_class_id INT;
    SELECT @student_id = student_id, @old_class_id = class_id
  FROM Enrollments
  WHERE id = @id;
    IF @student_id IS NULL
    BEGIN
    RAISERROR('Enrollment not found', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END

    -- ensure student is in target ClassStudents (insert if not exists)
    IF NOT EXISTS (SELECT 1
  FROM ClassStudents
  WHERE class_id = @new_class_id AND student_id = @student_id)
    BEGIN
    INSERT INTO ClassStudents
      (class_id, student_id, status, enrolled_at)
    VALUES
      (@new_class_id, @student_id, 'active', GETDATE());
  END
    ELSE
    BEGIN
    -- if exists, ensure status isn't reserved
    UPDATE ClassStudents
      SET status = 'active'
      WHERE class_id = @new_class_id AND student_id = @student_id;
  END

    -- update enrollment to point to new class and set active
    UPDATE Enrollments
    SET class_id = @new_class_id,
        status = 'active'
    WHERE id = @id;

    IF @@ROWCOUNT = 0
    BEGIN
    RAISERROR('Failed to update enrollment', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END

    -- remove from old class roster if different
    IF @old_class_id IS NOT NULL AND @old_class_id <> @new_class_id
    BEGIN
    DELETE FROM ClassStudents WHERE class_id = @old_class_id AND student_id = @student_id;
  END

    COMMIT TRANSACTION;

    SELECT *
  FROM Enrollments
  WHERE id = @id;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0
      ROLLBACK TRANSACTION;
    DECLARE @err NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR('sp_enrollments_transfer error: %s', 16, 1, @err);
    RETURN;
  END CATCH
END
GO

-- End of migration
PRINT 'Migration 2025-12-11_update_enrollments_and_classes_sp.sql applied (or created).';
