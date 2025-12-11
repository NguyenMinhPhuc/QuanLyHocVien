const fs = require('fs');
const path = require('path');
const db = require('../db');

async function run() {
  const pool = await db.getPool();
  // SQL to recreate sp_parents_create with student_id parameter
  const sql = `
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

  DECLARE @newParentId INT = SCOPE_IDENTITY();
  IF @student_id IS NOT NULL
  BEGIN
    UPDATE Parents SET student_id = @student_id WHERE id = @newParentId;
  END
END
GO
`;

  try {
    // remove GO batches and execute sequentially
    const batches = sql.split(/\r?\nGO\r?\n/gi).map(s => s.trim()).filter(Boolean);
    for (const b of batches) {
      await pool.request().batch(b);
    }
    console.log('sp_parents_create updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update sp_parents_create', err);
    process.exit(1);
  }
}

run();
