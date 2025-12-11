-- SQL Server schema for Center Management

CREATE TABLE Students
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  dob DATE NULL,
  phone NVARCHAR(50) NULL,
  email NVARCHAR(200) NULL,
  parent_phone NVARCHAR(50) NULL,
  status NVARCHAR(50) DEFAULT 'active'
);

CREATE TABLE Teachers
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  phone NVARCHAR(50) NULL,
  email NVARCHAR(200) NULL,
  user_id INT NULL FOREIGN KEY REFERENCES Users(id),
  status NVARCHAR(50) DEFAULT 'active'
);

CREATE TABLE Courses
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  level NVARCHAR(50) NULL,
  sessions INT DEFAULT 0,
  status NVARCHAR(50) DEFAULT 'active'
);

CREATE TABLE Classes
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  course_id INT NOT NULL FOREIGN KEY REFERENCES Courses(id),
  teacher_id INT NULL FOREIGN KEY REFERENCES Teachers(id),
  room NVARCHAR(100) NULL,
  schedule NVARCHAR(200) NULL,
  registration_open_date DATE NULL,
  registration_close_date DATE NULL,
  course_start_date DATE NULL,
  course_end_date DATE NULL,
  status NVARCHAR(50) DEFAULT 'active'
);

CREATE TABLE Attendance
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
  date DATE NOT NULL,
  status NVARCHAR(50) NULL,
  checkin_time DATETIME NULL
);

CREATE TABLE Assignments
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  title NVARCHAR(300) NOT NULL,
  description NVARCHAR(MAX) NULL,
  deadline DATETIME NULL
);

CREATE TABLE Submissions
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  assignment_id INT NOT NULL FOREIGN KEY REFERENCES Assignments(id),
  student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
  url NVARCHAR(1000) NULL,
  score DECIMAL(5,2) NULL
);

CREATE TABLE Progress
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  session_number INT NOT NULL,
  status NVARCHAR(50) NULL
);

CREATE TABLE Schedules
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  weekday TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE Notifications
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NULL,
  type NVARCHAR(100) NULL,
  message NVARCHAR(MAX) NULL,
  created_at DATETIME DEFAULT GETDATE()
);

-- Optional: simple Users/Roles table for auth scaffolding
CREATE TABLE Users
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(200) NOT NULL UNIQUE,
  password_hash NVARCHAR(500) NOT NULL,
  role NVARCHAR(50) NOT NULL,
  -- administrator, teacher, parent, student
  status NVARCHAR(50) DEFAULT 'active'
);

-- Stored procedures for Users
GO
-- Stored procedures for Teachers
IF OBJECT_ID('dbo.sp_teachers_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_teachers_get_all;
GO
CREATE PROCEDURE dbo.sp_teachers_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Teachers
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_teachers_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_teachers_get_by_id;
GO
CREATE PROCEDURE dbo.sp_teachers_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Teachers
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_teachers_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_teachers_create;
GO
CREATE PROCEDURE dbo.sp_teachers_create
  @name NVARCHAR(200),
  @phone NVARCHAR(50) = NULL,
  @email NVARCHAR(200) = NULL,
  @user_id INT = NULL,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Teachers
    (name, phone, email, user_id, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@name, @phone, @email, @user_id, @status);
END
GO

IF OBJECT_ID('dbo.sp_teachers_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_teachers_update;
GO
CREATE PROCEDURE dbo.sp_teachers_update
  @id INT,
  @name NVARCHAR(200) = NULL,
  @phone NVARCHAR(50) = NULL,
  @email NVARCHAR(200) = NULL,
  @user_id INT = NULL,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Teachers
  SET
    name = COALESCE(@name, name),
    phone = COALESCE(@phone, phone),
    email = COALESCE(@email, email),
    user_id = COALESCE(@user_id, user_id),
    status = COALESCE(@status, status)
  WHERE id = @id;
  SELECT *
  FROM Teachers
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_teachers_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_teachers_delete;
GO
CREATE PROCEDURE dbo.sp_teachers_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Teachers WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Courses
IF OBJECT_ID('dbo.sp_courses_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_courses_get_all;
GO
CREATE PROCEDURE dbo.sp_courses_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Courses
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_courses_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_courses_get_by_id;
GO
CREATE PROCEDURE dbo.sp_courses_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Courses
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_courses_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_courses_create;
GO
CREATE PROCEDURE dbo.sp_courses_create
  @name NVARCHAR(200),
  @description NVARCHAR(MAX) = NULL,
  @level NVARCHAR(50) = NULL,
  @sessions INT = 0,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Courses
    (name, description, level, sessions, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@name, @description, @level, @sessions, @status);
END
GO

IF OBJECT_ID('dbo.sp_courses_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_courses_update;
GO
CREATE PROCEDURE dbo.sp_courses_update
  @id INT,
  @name NVARCHAR(200) = NULL,
  @description NVARCHAR(MAX) = NULL,
  @level NVARCHAR(50) = NULL,
  @sessions INT = NULL,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Courses
  SET
    name = COALESCE(@name, name),
    description = COALESCE(@description, description),
    level = COALESCE(@level, level),
    sessions = COALESCE(@sessions, sessions),
    status = COALESCE(@status, status)
  WHERE id = @id;
  SELECT *
  FROM Courses
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_courses_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_courses_delete;
GO
CREATE PROCEDURE dbo.sp_courses_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Courses WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Classes
IF OBJECT_ID('dbo.sp_classes_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_classes_get_all;
GO
CREATE PROCEDURE dbo.sp_classes_get_all
AS
BEGIN
  SET NOCOUNT ON;
  -- return classes with course name, teacher name and dates for easier UI display
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

IF OBJECT_ID('dbo.sp_classes_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_classes_get_by_id;
GO
CREATE PROCEDURE dbo.sp_classes_get_by_id
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

IF OBJECT_ID('dbo.sp_classes_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_classes_create;
GO
CREATE PROCEDURE dbo.sp_classes_create
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

IF OBJECT_ID('dbo.sp_classes_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_classes_update;
GO
CREATE PROCEDURE dbo.sp_classes_update
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

IF OBJECT_ID('dbo.sp_classes_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_classes_delete;
GO
CREATE PROCEDURE dbo.sp_classes_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Classes WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Attendance
IF OBJECT_ID('dbo.sp_attendance_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_attendance_get_all;
GO
CREATE PROCEDURE dbo.sp_attendance_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Attendance
  ORDER BY date DESC, id;
END
GO

IF OBJECT_ID('dbo.sp_attendance_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_attendance_get_by_id;
GO
CREATE PROCEDURE dbo.sp_attendance_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Attendance
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_attendance_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_attendance_create;
GO
CREATE PROCEDURE dbo.sp_attendance_create
  @class_id INT,
  @student_id INT,
  @date DATE,
  @status NVARCHAR(50) = NULL,
  @checkin_time DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Attendance
    (class_id, student_id, date, status, checkin_time)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @student_id, @date, @status, @checkin_time);
END
GO

IF OBJECT_ID('dbo.sp_attendance_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_attendance_update;
GO
CREATE PROCEDURE dbo.sp_attendance_update
  @id INT,
  @class_id INT = NULL,
  @student_id INT = NULL,
  @date DATE = NULL,
  @status NVARCHAR(50) = NULL,
  @checkin_time DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Attendance
  SET
    class_id = COALESCE(@class_id, class_id),
    student_id = COALESCE(@student_id, student_id),
    date = COALESCE(@date, date),
    status = COALESCE(@status, status),
    checkin_time = COALESCE(@checkin_time, checkin_time)
  WHERE id = @id;
  SELECT *
  FROM Attendance
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_attendance_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_attendance_delete;
GO
CREATE PROCEDURE dbo.sp_attendance_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Attendance WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Assignments
IF OBJECT_ID('dbo.sp_assignments_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_assignments_get_all;
GO
CREATE PROCEDURE dbo.sp_assignments_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Assignments
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_assignments_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_assignments_get_by_id;
GO
CREATE PROCEDURE dbo.sp_assignments_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Assignments
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_assignments_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_assignments_create;
GO
CREATE PROCEDURE dbo.sp_assignments_create
  @class_id INT,
  @title NVARCHAR(300),
  @description NVARCHAR(MAX) = NULL,
  @deadline DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Assignments
    (class_id, title, description, deadline)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @title, @description, @deadline);
END
GO

IF OBJECT_ID('dbo.sp_assignments_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_assignments_update;
GO
CREATE PROCEDURE dbo.sp_assignments_update
  @id INT,
  @class_id INT = NULL,
  @title NVARCHAR(300) = NULL,
  @description NVARCHAR(MAX) = NULL,
  @deadline DATETIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Assignments
  SET
    class_id = COALESCE(@class_id, class_id),
    title = COALESCE(@title, title),
    description = COALESCE(@description, description),
    deadline = COALESCE(@deadline, deadline)
  WHERE id = @id;
  SELECT *
  FROM Assignments
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_assignments_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_assignments_delete;
GO
CREATE PROCEDURE dbo.sp_assignments_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Assignments WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Submissions
IF OBJECT_ID('dbo.sp_submissions_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_submissions_get_all;
GO
CREATE PROCEDURE dbo.sp_submissions_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Submissions
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_submissions_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_submissions_get_by_id;
GO
CREATE PROCEDURE dbo.sp_submissions_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Submissions
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_submissions_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_submissions_create;
GO
CREATE PROCEDURE dbo.sp_submissions_create
  @assignment_id INT,
  @student_id INT,
  @url NVARCHAR(1000) = NULL,
  @score DECIMAL(5,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Submissions
    (assignment_id, student_id, url, score)
  OUTPUT
  INSERTED.*
  VALUES
    (@assignment_id, @student_id, @url, @score);
END
GO

IF OBJECT_ID('dbo.sp_submissions_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_submissions_update;
GO
CREATE PROCEDURE dbo.sp_submissions_update
  @id INT,
  @assignment_id INT = NULL,
  @student_id INT = NULL,
  @url NVARCHAR(1000) = NULL,
  @score DECIMAL(5,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Submissions
  SET
    assignment_id = COALESCE(@assignment_id, assignment_id),
    student_id = COALESCE(@student_id, student_id),
    url = COALESCE(@url, url),
    score = COALESCE(@score, score)
  WHERE id = @id;
  SELECT *
  FROM Submissions
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_submissions_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_submissions_delete;
GO
CREATE PROCEDURE dbo.sp_submissions_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Submissions WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Progress
IF OBJECT_ID('dbo.sp_progress_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_progress_get_all;
GO
CREATE PROCEDURE dbo.sp_progress_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Progress
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_progress_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_progress_get_by_id;
GO
CREATE PROCEDURE dbo.sp_progress_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Progress
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_progress_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_progress_create;
GO
CREATE PROCEDURE dbo.sp_progress_create
  @student_id INT,
  @class_id INT,
  @session_number INT,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Progress
    (student_id, class_id, session_number, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@student_id, @class_id, @session_number, @status);
END
GO

IF OBJECT_ID('dbo.sp_progress_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_progress_update;
GO
CREATE PROCEDURE dbo.sp_progress_update
  @id INT,
  @student_id INT = NULL,
  @class_id INT = NULL,
  @session_number INT = NULL,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Progress
  SET
    student_id = COALESCE(@student_id, student_id),
    class_id = COALESCE(@class_id, class_id),
    session_number = COALESCE(@session_number, session_number),
    status = COALESCE(@status, status)
  WHERE id = @id;
  SELECT *
  FROM Progress
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_progress_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_progress_delete;
GO
CREATE PROCEDURE dbo.sp_progress_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Progress WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Schedules
IF OBJECT_ID('dbo.sp_schedules_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_schedules_get_all;
GO
CREATE PROCEDURE dbo.sp_schedules_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Schedules
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_schedules_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_schedules_get_by_id;
GO
CREATE PROCEDURE dbo.sp_schedules_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Schedules
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_schedules_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_schedules_create;
GO
CREATE PROCEDURE dbo.sp_schedules_create
  @class_id INT,
  @weekday TINYINT,
  @start_time TIME,
  @end_time TIME
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Schedules
    (class_id, weekday, start_time, end_time)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @weekday, @start_time, @end_time);
END
GO

IF OBJECT_ID('dbo.sp_schedules_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_schedules_update;
GO
CREATE PROCEDURE dbo.sp_schedules_update
  @id INT,
  @class_id INT = NULL,
  @weekday TINYINT = NULL,
  @start_time TIME = NULL,
  @end_time TIME = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Schedules
  SET
    class_id = COALESCE(@class_id, class_id),
    weekday = COALESCE(@weekday, weekday),
    start_time = COALESCE(@start_time, start_time),
    end_time = COALESCE(@end_time, end_time)
  WHERE id = @id;
  SELECT *
  FROM Schedules
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_schedules_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_schedules_delete;
GO
CREATE PROCEDURE dbo.sp_schedules_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Schedules WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Stored procedures for Notifications
IF OBJECT_ID('dbo.sp_notifications_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_notifications_get_all;
GO
CREATE PROCEDURE dbo.sp_notifications_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Notifications
  ORDER BY created_at DESC;
END
GO

IF OBJECT_ID('dbo.sp_notifications_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_notifications_get_by_id;
GO
CREATE PROCEDURE dbo.sp_notifications_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Notifications
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_notifications_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_notifications_create;
GO
CREATE PROCEDURE dbo.sp_notifications_create
  @user_id INT = NULL,
  @type NVARCHAR(100) = NULL,
  @message NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Notifications
    (user_id, type, message)
  OUTPUT
  INSERTED.*
  VALUES
    (@user_id, @type, @message);
END
GO

IF OBJECT_ID('dbo.sp_notifications_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_notifications_delete;
GO
CREATE PROCEDURE dbo.sp_notifications_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Notifications WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Refresh tokens table for cookie-based refresh flow
IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NOT NULL
  DROP TABLE dbo.RefreshTokens;
GO
CREATE TABLE RefreshTokens
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
  token NVARCHAR(512) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT GETDATE()
);
GO

IF OBJECT_ID('dbo.sp_refresh_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_refresh_create;
GO
CREATE PROCEDURE dbo.sp_refresh_create
  @user_id INT,
  @token NVARCHAR(512),
  @expires_at DATETIME
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO RefreshTokens
    (user_id, token, expires_at)
  OUTPUT
  INSERTED.id,
  INSERTED.user_id,
  INSERTED.token,
  INSERTED.expires_at
  VALUES
    (@user_id, @token, @expires_at);
END
GO

IF OBJECT_ID('dbo.sp_refresh_get_by_token', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_refresh_get_by_token;
GO
CREATE PROCEDURE dbo.sp_refresh_get_by_token
  @token NVARCHAR(512)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM RefreshTokens
  WHERE token = @token;
END
GO

IF OBJECT_ID('dbo.sp_refresh_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_refresh_delete;
GO
CREATE PROCEDURE dbo.sp_refresh_delete
  @token NVARCHAR(512)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM RefreshTokens WHERE token = @token;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

IF OBJECT_ID('dbo.sp_refresh_delete_by_user', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_refresh_delete_by_user;
GO
CREATE PROCEDURE dbo.sp_refresh_delete_by_user
  @user_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM RefreshTokens WHERE user_id = @user_id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO
IF OBJECT_ID('dbo.sp_users_get_by_username', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_users_get_by_username;
GO
CREATE PROCEDURE dbo.sp_users_get_by_username
  @username NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    id, username, password_hash, role, status
  FROM Users
  WHERE username = @username;
END
GO

IF OBJECT_ID('dbo.sp_users_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_users_create;
GO
CREATE PROCEDURE dbo.sp_users_create
  @username NVARCHAR(200),
  @password_hash NVARCHAR(500),
  @role NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Users
    (username, password_hash, role)
  OUTPUT
  INSERTED.id,
  INSERTED.username,
  INSERTED.role
  VALUES
    (@username, @password_hash, @role);
END
GO

-- Stored procedures for Students (CRUD)
IF OBJECT_ID('dbo.sp_students_get_all', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_students_get_all;
GO
CREATE PROCEDURE dbo.sp_students_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Students
  ORDER BY id;
END
GO

IF OBJECT_ID('dbo.sp_students_get_by_id', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_students_get_by_id;
GO
CREATE PROCEDURE dbo.sp_students_get_by_id
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Students
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_students_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_students_create;
GO
CREATE PROCEDURE dbo.sp_students_create
  @name NVARCHAR(200),
  @dob DATE = NULL,
  @phone NVARCHAR(50) = NULL,
  @email NVARCHAR(200) = NULL,
  @parent_phone NVARCHAR(50) = NULL,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Students
    (name, dob, phone, email, parent_phone, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@name, @dob, @phone, @email, @parent_phone, @status);
END
GO

IF OBJECT_ID('dbo.sp_students_update', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_students_update;
GO
CREATE PROCEDURE dbo.sp_students_update
  @id INT,
  @name NVARCHAR(200) = NULL,
  @dob DATE = NULL,
  @phone NVARCHAR(50) = NULL,
  @email NVARCHAR(200) = NULL,
  @parent_phone NVARCHAR(50) = NULL,
  @status NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Students
  SET
    name = COALESCE(@name, name),
    dob = COALESCE(@dob, dob),
    phone = COALESCE(@phone, phone),
    email = COALESCE(@email, email),
    parent_phone = COALESCE(@parent_phone, parent_phone),
    status = COALESCE(@status, status)
  WHERE id = @id;

  SELECT *
  FROM Students
  WHERE id = @id;
END
GO

IF OBJECT_ID('dbo.sp_students_delete', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_students_delete;
GO
CREATE PROCEDURE dbo.sp_students_delete
  @id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Students WHERE id = @id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- New tables to support multiple parents per student
IF OBJECT_ID('dbo.Parents', 'U') IS NOT NULL
  DROP TABLE dbo.Parents;
GO
CREATE TABLE Parents
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NULL,
  phone NVARCHAR(50) NULL,
  email NVARCHAR(200) NULL,
  user_id INT NULL FOREIGN KEY REFERENCES Users(id),
  -- optional direct FK to associate a parent with a single student (one-to-many)
  student_id INT NULL FOREIGN KEY REFERENCES Students(id),
  status NVARCHAR(50) DEFAULT 'active'
);
GO

IF OBJECT_ID('dbo.StudentParents', 'U') IS NOT NULL
  DROP TABLE dbo.StudentParents;
GO
CREATE TABLE StudentParents
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
  parent_id INT NOT NULL FOREIGN KEY REFERENCES Parents(id),
  relationship NVARCHAR(100) NULL,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT UQ_StudentParent UNIQUE (student_id, parent_id)
);
GO

-- Stored procedure to create a parent record
IF OBJECT_ID('dbo.sp_parents_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_parents_create;
GO
CREATE PROCEDURE dbo.sp_parents_create
  @name NVARCHAR(200) = NULL,
  @phone NVARCHAR(50) = NULL,
  @email NVARCHAR(200) = NULL,
  @user_id INT = NULL,
  @student_id INT = NULL,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Parents
    (name, phone, email, user_id, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@name, @phone, @email, @user_id, @status);

  -- If a student_id was provided, update the created parent row to set student_id
  -- (we use SCOPE_IDENTITY to obtain the inserted id)
  DECLARE @newParentId INT = SCOPE_IDENTITY();
  IF @student_id IS NOT NULL
  BEGIN
    UPDATE Parents SET student_id = @student_id WHERE id = @newParentId;
  END
END
GO

-- Stored procedure to link a parent to a student
IF OBJECT_ID('dbo.sp_student_parents_link_create', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_student_parents_link_create;
GO
CREATE PROCEDURE dbo.sp_student_parents_link_create
  @student_id INT,
  @parent_id INT,
  @relationship NVARCHAR(100) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO StudentParents
    (student_id, parent_id, relationship)
  OUTPUT
  INSERTED.*
  VALUES
    (@student_id, @parent_id, @relationship);
END
GO

-- Stored procedure to return parents for a given student
IF OBJECT_ID('dbo.sp_parents_get_by_student', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_parents_get_by_student;
GO
CREATE PROCEDURE dbo.sp_parents_get_by_student
  @student_id INT
AS
BEGIN
  SET NOCOUNT ON;
  -- Return parents directly linked via Parents.student_id OR linked via StudentParents join table
  SELECT DISTINCT p.id, p.name, p.phone, p.email, p.user_id, sp.relationship
  FROM Parents p
    LEFT JOIN StudentParents sp ON p.id = sp.parent_id
  WHERE p.student_id = @student_id OR sp.student_id = @student_id
  ORDER BY p.id;
END
GO

-- Optional: remove all parent links for a student (used if updating parents)
IF OBJECT_ID('dbo.sp_student_parents_delete_by_student', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_student_parents_delete_by_student;
GO
CREATE PROCEDURE dbo.sp_student_parents_delete_by_student
  @student_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM StudentParents WHERE student_id = @student_id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Table to track enrolled students in classes
IF OBJECT_ID('dbo.ClassStudents', 'U') IS NOT NULL
  DROP TABLE dbo.ClassStudents;
GO
CREATE TABLE ClassStudents
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  student_id INT NOT NULL FOREIGN KEY REFERENCES Students(id),
  enrolled_at DATETIME DEFAULT GETDATE(),
  status NVARCHAR(50) DEFAULT 'active',
  CONSTRAINT UQ_ClassStudent UNIQUE (class_id, student_id)
);
GO

-- Stored procedure to list students in a class
IF OBJECT_ID('dbo.sp_class_students_get_by_class', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_students_get_by_class;
GO
CREATE PROCEDURE dbo.sp_class_students_get_by_class
  @class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT cs.id, cs.class_id, cs.student_id, cs.enrolled_at, cs.status, s.name, s.phone, s.email
  FROM ClassStudents cs
    INNER JOIN Students s ON s.id = cs.student_id
  WHERE cs.class_id = @class_id
  ORDER BY cs.enrolled_at DESC;
END
GO

-- Stored procedure to add a student to a class
IF OBJECT_ID('dbo.sp_class_students_add', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_students_add;
GO
CREATE PROCEDURE dbo.sp_class_students_add
  @class_id INT,
  @student_id INT,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1
  FROM ClassStudents
  WHERE class_id = @class_id AND student_id = @student_id)
  BEGIN
    -- already enrolled, return existing row
    SELECT *
    FROM ClassStudents
    WHERE class_id = @class_id AND student_id = @student_id;
    RETURN;
  END
  INSERT INTO ClassStudents
    (class_id, student_id, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @student_id, @status);
END
GO

-- Stored procedure to remove a student from a class
IF OBJECT_ID('dbo.sp_class_students_remove', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_students_remove;
GO
CREATE PROCEDURE dbo.sp_class_students_remove
  @class_id INT,
  @student_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM ClassStudents WHERE class_id = @class_id AND student_id = @student_id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO

-- Table to associate multiple teachers with a class
IF OBJECT_ID('dbo.ClassTeachers', 'U') IS NOT NULL
  DROP TABLE dbo.ClassTeachers;
GO
CREATE TABLE ClassTeachers
(
  id INT IDENTITY(1,1) PRIMARY KEY,
  class_id INT NOT NULL FOREIGN KEY REFERENCES Classes(id),
  teacher_id INT NOT NULL FOREIGN KEY REFERENCES Teachers(id),
  assigned_at DATETIME DEFAULT GETDATE(),
  status NVARCHAR(50) DEFAULT 'active',
  CONSTRAINT UQ_ClassTeacher UNIQUE (class_id, teacher_id)
);
GO

-- Stored procedure to list teachers for a given class
IF OBJECT_ID('dbo.sp_class_teachers_get_by_class', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_teachers_get_by_class;
GO
CREATE PROCEDURE dbo.sp_class_teachers_get_by_class
  @class_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT ct.id, ct.class_id, ct.teacher_id, ct.assigned_at, ct.status, t.name, t.phone, t.email
  FROM ClassTeachers ct
    INNER JOIN Teachers t ON t.id = ct.teacher_id
  WHERE ct.class_id = @class_id
  ORDER BY ct.assigned_at DESC;
END
GO

-- Stored procedure to add a teacher to a class
IF OBJECT_ID('dbo.sp_class_teachers_add', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_teachers_add;
GO
CREATE PROCEDURE dbo.sp_class_teachers_add
  @class_id INT,
  @teacher_id INT,
  @status NVARCHAR(50) = 'active'
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1
  FROM ClassTeachers
  WHERE class_id = @class_id AND teacher_id = @teacher_id)
  BEGIN
    SELECT *
    FROM ClassTeachers
    WHERE class_id = @class_id AND teacher_id = @teacher_id;
    RETURN;
  END
  INSERT INTO ClassTeachers
    (class_id, teacher_id, status)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @teacher_id, @status);
END
GO

-- Stored procedure to remove a teacher from a class
IF OBJECT_ID('dbo.sp_class_teachers_remove', 'P') IS NOT NULL
  DROP PROCEDURE dbo.sp_class_teachers_remove;
GO
CREATE PROCEDURE dbo.sp_class_teachers_remove
  @class_id INT,
  @teacher_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM ClassTeachers WHERE class_id = @class_id AND teacher_id = @teacher_id;
  SELECT @@ROWCOUNT AS rows_affected;
END
GO
