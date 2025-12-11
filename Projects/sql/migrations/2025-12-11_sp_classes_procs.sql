USE [CenterManagement]
GO

/****** Migration: Update sp_classes_get_all and sp_classes_get_by_id ******/

-- This migration only updates the two stored procedures to return teacher_name
-- so the frontend can read `teacher_name` directly.

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
