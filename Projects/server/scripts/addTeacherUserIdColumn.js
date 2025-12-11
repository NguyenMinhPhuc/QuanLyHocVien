const db = require('../db');

async function run() {
  const pool = await db.getPool();

  const sql = `
-- Add user_id column to Teachers if it doesn't exist
IF COL_LENGTH('dbo.Teachers', 'user_id') IS NULL
BEGIN
  ALTER TABLE Teachers ADD user_id INT NULL;
END

-- Add foreign key constraint if not exists
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys fk JOIN sys.objects o ON fk.parent_object_id = o.object_id WHERE o.name = 'Teachers' AND fk.name = 'FK_Teachers_Users_user_id')
BEGIN
  ALTER TABLE Teachers
    ADD CONSTRAINT FK_Teachers_Users_user_id FOREIGN KEY (user_id) REFERENCES Users(id);
END

-- Recreate procedures for teachers (safe to run)
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
`;

  try {
    const batches = sql.split(/\r?\nGO\r?\n/gi).map(s => s.trim()).filter(Boolean);
    for (const b of batches) {
      await pool.request().batch(b);
    }
    console.log('Teachers table and procs updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply migration for Teachers.user_id', err);
    process.exit(1);
  }
}

run();
