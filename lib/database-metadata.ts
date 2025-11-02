import fs from 'fs/promises';
import path from 'path';

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface DatabaseTable {
  name: string;
  description: string;
  columns: DatabaseColumn[];
}

export interface CommonQuery {
  name: string;
  description: string;
  template: string;
}

export interface DatabaseConfig {
  id: string;
  name: string;
  type: string;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  tables: DatabaseTable[];
  commonQueries?: CommonQuery[];
}

export interface DatabaseMetadata {
  version: string;
  lastUpdated: string;
  databases: DatabaseConfig[];
  metadata: {
    refreshInterval: string;
    autoRefresh: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}

let cachedMetadata: DatabaseMetadata | null = null;

export async function loadDatabaseMetadata(): Promise<DatabaseMetadata> {
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const metadataPath = path.join(process.cwd(), 'config', 'database-metadata.json');
  const data = await fs.readFile(metadataPath, 'utf-8');
  cachedMetadata = JSON.parse(data);
  
  return cachedMetadata!;
}

export function resolveEnvVar(value: string): string {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const envVar = value.slice(2, -1);
    let envValue = process.env[envVar];
    if (typeof envValue === 'string') {
      envValue = envValue.trim();
      // Remove quotes if present
      if ((envValue.startsWith('"') && envValue.endsWith('"')) || 
          (envValue.startsWith("'") && envValue.endsWith("'"))) {
        envValue = envValue.slice(1, -1);
      }
    }
    return envValue || '';
  }
  return value;
}

export async function getDatabaseConfig(dbId: string): Promise<DatabaseConfig | null> {
  const metadata = await loadDatabaseMetadata();
  return metadata.databases.find(db => db.id === dbId) || null;
}

export function getSchemaContext(config: DatabaseConfig): string {
  return `
Database: ${config.name}
Type: ${config.type}

Available Tables:
${config.tables.map(table => `
Table: ${table.name}
Description: ${table.description}
Columns:
${table.columns.map(col => `  - ${col.name} (${col.type}${col.nullable ? ', nullable' : ''})${col.description ? ' - ' + col.description : ''}`).join('\n')}
`).join('\n')}

Common Query Patterns:
${config.commonQueries?.map(q => `
${q.name}: ${q.description}
Template: ${q.template}
`).join('\n') || 'None defined'}
`.trim();
}
