USE [CenterManagement]
GO

/****** Migration: Add date fields to Classes and update procedures ******/
-- Add columns if they don't exist
IF COL_LENGTH('dbo.Classes', 'registration_open_date') IS NULL
BEGIN
  ALTER TABLE dbo.Classes ADD registration_open_date DATE NULL
END
GO
IF COL_LENGTH('dbo.Classes', 'registration_close_date') IS NULL
BEGIN
  ALTER TABLE dbo.Classes ADD registration_close_date DATE NULL
END
GO
IF COL_LENGTH('dbo.Classes', 'course_start_date') IS NULL
BEGIN
  ALTER TABLE dbo.Classes ADD course_start_date DATE NULL
END
GO
IF COL_LENGTH('dbo.Classes', 'course_end_date') IS NULL
BEGIN
  ALTER TABLE dbo.Classes ADD course_end_date DATE NULL
END
GO

-- Update procedures (create or alter)
CREATE OR ALTER PROCEDURE dbo.sp_classes_create
  @course_id INT,
  @teacher_id INT = NULL,
  @room NVARCHAR(100) = NULL,
  @schedule NVARCHAR(200) = NULL,
  @registration_open_date DATE = NULL,
  @registration_close_date DATE = NULL,
  @course_start_date DATE = NULL,
  @course_end_date DATE = NULL,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Classes
    (course_id, teacher_id, room, schedule, registration_open_date, registration_close_date, course_start_date, course_end_date, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@course_id, @teacher_id, @room, @schedule, @registration_open_date, @registration_close_date, @course_start_date, @course_end_date, @status);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_classes_update
  @id INT,
  @course_id INT = NULL,
  @teacher_id INT = NULL,
  @room NVARCHAR(100) = NULL,
  @schedule NVARCHAR(200) = NULL,
  @registration_open_date DATE = NULL,
  @registration_close_date DATE = NULL,
  @course_start_date DATE = NULL,
  @course_end_date DATE = NULL,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Classes
  SET
    course_id = COALESCE(@course_id, course_id),
    teacher_id = COALESCE(@teacher_id, teacher_id),
    room = COALESCE(@room, room),
    schedule = COALESCE(@schedule, schedule),
    registration_open_date = COALESCE(@registration_open_date, registration_open_date),
    registration_close_date = COALESCE(@registration_close_date, registration_close_date),
    course_start_date = COALESCE(@course_start_date, course_start_date),
    course_end_date = COALESCE(@course_end_date, course_end_date),
    status = COALESCE(@status, status)
  WHERE id = @id;
  SELECT *
  FROM Classes
  WHERE id = @id;
END
GO

-- Also ensure get_all/get_by_id procedures exist (they already include cl.* so no change required)
CREATE OR ALTER PROCEDURE dbo.sp_classes_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT cl.*, co.name AS course_name, t.name AS teacher_name,
    (SELECT COUNT(1)
    FROM ClassStudents cs
    WHERE cs.class_id = cl.id AND cs.status = 'active') AS student_count
  FROM Classes cl
    LEFT JOIN Courses co ON co.id = cl.course_id
    LEFT JOIN Teachers t ON t.id = cl.teacher_id
  ORDER BY cl.id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_classes_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT cl.*, co.name AS course_name, t.name AS teacher_name,
    (SELECT COUNT(1)
    FROM ClassStudents cs
    WHERE cs.class_id = cl.id AND cs.status = 'active') AS student_count
  FROM Classes cl
    LEFT JOIN Courses co ON co.id = cl.course_id
    LEFT JOIN Teachers t ON t.id = cl.teacher_id
  WHERE cl.id = @id;
END
GO
