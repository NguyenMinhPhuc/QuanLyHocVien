const db = require('../db');

async function run() {
  const pool = await db.getPool();

  const sql = `
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
    console.log('sp_teachers_create/update updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update teacher procs', err);
    process.exit(1);
  }
}

run();
