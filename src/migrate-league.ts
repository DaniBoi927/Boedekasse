import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const config: sql.config = {
    server: process.env.AZURE_DB_HOST!,
    port: parseInt(process.env.AZURE_DB_PORT || '1433'),
    user: process.env.AZURE_DB_USER!,
    password: process.env.AZURE_DB_PASSWORD!,
    database: process.env.AZURE_DB_NAME!,
    options: {
      encrypt: true,
      trustServerCertificate: false
    }
  };

  try {
    const pool = await sql.connect(config);
    console.log('Connected to Azure SQL');

    // Check if columns exist and add if not
    const columns = [
      { name: 'rankedin_url', type: 'NVARCHAR(500)' },
      { name: 'rankedin_team_name', type: 'NVARCHAR(100)' },
      { name: 'league_data', type: 'NVARCHAR(MAX)' },
      { name: 'league_updated_at', type: 'DATETIME' }
    ];

    for (const col of columns) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('teams') AND name = '${col.name}')
          BEGIN
            ALTER TABLE teams ADD ${col.name} ${col.type} NULL;
            PRINT 'Added column ${col.name}';
          END
        `);
        console.log(`✓ Column ${col.name} checked/added`);
      } catch (err) {
        console.log(`Column ${col.name} might already exist`);
      }
    }

    console.log('Migration complete!');
    await pool.close();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
