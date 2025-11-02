import { NextResponse } from 'next/server';
import oracledb from 'oracledb';
import { getDatabaseConfig, resolveEnvVar } from '@/lib/database-metadata';

// Initialize Oracle client (do this once at startup)
let oracleInitialized = false;

if (!oracleInitialized) {
  try {
    oracledb.initOracleClient({
      libDir: process.env.ORACLE_CLIENT_LIB_DIR
    });
    oracleInitialized = true;
    console.log('Oracle client initialized');
  } catch (err) {
    console.error('Oracle client init error:', err);
  }
}
// Helper to get Oracle connection using metadata
async function getOracleConnection() {
  const config = await getDatabaseConfig('ora1');
  if (!config) {
    throw new Error('Database configuration not found');
  }

  const host = resolveEnvVar(config.host);
  const port = resolveEnvVar(config.port);
  const database = resolveEnvVar(config.database);
  const user = resolveEnvVar(config.username);
  const password = resolveEnvVar(config.password);
  
  const connectString = `${host}:${port}/${database}`;
  
  return await oracledb.getConnection({
    user,
    password,
    connectString
  });
}
// Helper to get Oracle connection
async function getOracleConnection() {
  const connectString = `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_DATABASE}`;
  
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString
  });
}

// Test connection endpoint
export async function GET() {
  let connection;
  try {
    connection = await getOracleConnection();
    await connection.execute('SELECT 1 FROM DUAL');
    return NextResponse.json({ 
      success: true, 
      message: 'Connected to CIW database' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Execute query endpoint
export async function POST(req: Request) {
  const { query } = await req.json();
  let connection;
  
  try {
    connection = await getOracleConnection();
    const result = await connection.execute(query, [], { 
      outFormat: oracledb.OUT_FORMAT_OBJECT 
    });
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows || [] 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
