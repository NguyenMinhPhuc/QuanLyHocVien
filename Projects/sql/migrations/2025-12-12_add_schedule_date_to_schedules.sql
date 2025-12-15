-- Add schedule_date to Schedules and update related stored procedures
ALTER TABLE Schedules ADD schedule_date DATE NULL;
GO

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
  @end_time TIME,
  @schedule_date DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Schedules
    (class_id, weekday, start_time, end_time, schedule_date)
  OUTPUT
  INSERTED.*
  VALUES
    (@class_id, @weekday, @start_time, @end_time, @schedule_date);
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
  @end_time TIME = NULL,
  @schedule_date DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Schedules
  SET
    class_id = COALESCE(@class_id, class_id),
    weekday = COALESCE(@weekday, weekday),
    start_time = COALESCE(@start_time, start_time),
    end_time = COALESCE(@end_time, end_time),
    schedule_date = COALESCE(@schedule_date, schedule_date)
  WHERE id = @id;
  SELECT *
  FROM Schedules
  WHERE id = @id;
END
GO
