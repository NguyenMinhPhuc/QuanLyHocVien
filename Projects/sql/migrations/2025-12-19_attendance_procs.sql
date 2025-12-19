-- Attendance and class ownership helper stored procedures
GO

-- Classes for a teacher (by Users.id linked through Teachers.user_id)
CREATE OR ALTER PROCEDURE sp_classes_get_by_teacher_user
  @user_id INT,
  @date DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT
    c.*,
    co.name AS course_name,
    cs_counts.student_count,
    att.present_count,
    att.absent_count,
    att.tardy_count
  FROM Classes c
    INNER JOIN Teachers t ON t.id = c.teacher_id
    LEFT JOIN Courses co ON co.id = c.course_id
    LEFT JOIN (
      SELECT class_id, COUNT(*) AS student_count
    FROM ClassStudents
    GROUP BY class_id
    ) cs_counts ON cs_counts.class_id = c.id
    LEFT JOIN (
      SELECT class_id,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
      SUM(CASE WHEN status = 'tardy' THEN 1 ELSE 0 END) AS tardy_count
    FROM Attendance
    WHERE (@date IS NULL OR date = @date)
    GROUP BY class_id
    ) att ON att.class_id = c.id
  WHERE t.user_id = @user_id
  ORDER BY c.id;
END
GO

-- Check if a class belongs to a teacher user_id (returns 1 row when owned)
CREATE OR ALTER PROCEDURE sp_class_teacher_owns
  @class_id INT,
  @user_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT 1 AS owns
  FROM Classes c
    INNER JOIN Teachers t ON t.id = c.teacher_id
  WHERE c.id = @class_id AND t.user_id = @user_id;
END
GO

-- Students of a class (reuse-able; includes name/phone/email)
CREATE OR ALTER PROCEDURE sp_class_students_get_basic
  @class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT cs.student_id AS id, s.name, s.phone, s.email, cs.status AS enrollment_status
  FROM ClassStudents cs
    INNER JOIN Students s ON s.id = cs.student_id
  WHERE cs.class_id = @class_id
  ORDER BY cs.enrolled_at DESC;
END
GO

-- Attendance lookup by class and date
CREATE OR ALTER PROCEDURE sp_attendance_get_by_class_and_date
  @class_id INT,
  @date DATE
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Attendance a
  WHERE a.class_id = @class_id AND a.date = @date;
END
GO

-- Upsert attendance for one student on a date
CREATE OR ALTER PROCEDURE sp_attendance_upsert
  @class_id INT,
  @student_id INT,
  @date DATE,
  @status NVARCHAR(50),
  @checkin_time DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1
  FROM Attendance
  WHERE class_id = @class_id AND student_id = @student_id AND date = @date)
  BEGIN
    UPDATE Attendance
    SET status = @status,
        checkin_time = @checkin_time,
        updated_at = GETDATE()
    WHERE class_id = @class_id AND student_id = @student_id AND date = @date;
  END
  ELSE
  BEGIN
    INSERT INTO Attendance
      (class_id, student_id, date, status, checkin_time, created_at)
    VALUES
      (@class_id, @student_id, @date, @status, @checkin_time, GETDATE());
  END
  SELECT *
  FROM Attendance
  WHERE class_id = @class_id AND student_id = @student_id AND date = @date;
END
GO

-- Update class student status (used to keep everything in stored procs)
CREATE OR ALTER PROCEDURE sp_class_students_update_status
  @class_id INT,
  @student_id INT,
  @status NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE ClassStudents SET status = @status WHERE class_id = @class_id AND student_id = @student_id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO
