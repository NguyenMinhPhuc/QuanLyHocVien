-- Migration: create Attendance table
IF NOT EXISTS (SELECT *
FROM sys.tables
WHERE name = 'Attendance')
BEGIN
  CREATE TABLE Attendance
  (
    id INT IDENTITY(1,1) PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    [date] DATE NOT NULL,
    [status] VARCHAR(32) NOT NULL,
    checkin_time DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME NULL
  );

  ALTER TABLE Attendance ADD CONSTRAINT UQ_Attendance_ClassStudentDate UNIQUE (class_id, student_id, [date]);
END
