import BetterSqlite3 from 'better-sqlite3';
import envVar from 'env-var';
import fse from 'fs-extra';
import path from 'path';

import {
  DockerJobDefinitionRow,
  StateChangeValueWorkerFinished,
} from '../../shared/index.js';

// https://help.glitch.com/hc/en-us/articles/16287582103821-Do-you-have-built-in-persistence-or-a-database-
const DATABASE_DIRECTORY :string = path.resolve(envVar.get('DATABASE_DIRECTORY').default("../../.data/").asString());// local: /app/.data/jobs.db
fse.ensureDirSync(DATABASE_DIRECTORY);
const JOBS_DB_FILE = path.join(DATABASE_DIRECTORY, "jobs.db");
console.log('path.dirname(JOBS_DB_FILE)', path.dirname(JOBS_DB_FILE));
const sqllite = new BetterSqlite3(JOBS_DB_FILE, { verbose: console.log });

// TODO: add job result to cache, if successful
// finished is serialized StateChangeValueWorkerFinished
const createTables = () => {
    const schema = `
    CREATE TABLE IF NOT EXISTS cache (
        id text NOT NULL PRIMARY KEY,
        result text NOT NULL,
        created_at REAL
    );
    CREATE TABLE IF NOT EXISTS queue (
        id text NOT NULL PRIMARY KEY,
        queue text NOT NULL,
        hash text NOT NULL,
        job text NOT NULL,
        created_at REAL
    );
    `
    sqllite.exec(schema);
}
console.log('1️⃣ 2️⃣  setupDB')
createTables();

// save job results into persistent local storage. it expires after one week (not yet implemented).
const insertJobResultIntoCacheStatement = sqllite.prepare('INSERT INTO cache (id, result, created_at) VALUES (@id, @result, @created_at) ON CONFLICT(id) DO UPDATE SET result=@result');
const resultCacheGetStatement = sqllite.prepare('SELECT id, result, created_at FROM cache WHERE id=?');
const removeJobResultsFromCacheStatement = sqllite.prepare('DELETE FROM cache WHERE id = ?');
// queue, persisted only to allow ephemeral state restore on server start/restart
const queueJobAddStatement = sqllite.prepare('INSERT INTO queue (id, hash, queue, job, created_at) VALUES (@id, @queue, @hash, @job, @created_at) ON CONFLICT(id) DO UPDATE SET job=@job');
const queueJobUpdateStatement = sqllite.prepare('UPDATE queue SET job=@job where id = @id');
const queueJobRemoveStatement = sqllite.prepare('DELETE FROM queue where id = @id');
const getQueueStatement = sqllite.prepare('SELECT * FROM queue where queue = @queue');

export class DB {
    constructor() { }

    queueJobAdd(queue: string, job: DockerJobDefinitionRow): void {
        queueJobAddStatement.run({ queue, id: `${queue}-${job.hash}`, hash: job.hash, created_at: new Date().getTime(), job: JSON.stringify(job) });
    }

    queueJobUpdate(queue: string, job: DockerJobDefinitionRow): void {
        queueJobUpdateStatement.run({ id: `${queue}-${job.hash}`, job: JSON.stringify(job) });
    }

    queueJobRemove(queue: string, hash: string): void {
        queueJobRemoveStatement.run({ id: `${queue}-${hash}` });
    }

    queueGetAll(queue: string): DockerJobDefinitionRow[] {
        const results = getQueueStatement.all({ queue }) as { id: string, job: string, created_at: number }[];
        return results.map(v => JSON.parse(v.job));
    }

    resultCacheAdd(id: string, result: StateChangeValueWorkerFinished): void {
        insertJobResultIntoCacheStatement.run({ id, created_at: new Date().getTime(), result: JSON.stringify(result) });
    }

    resultCacheGet(id: string): StateChangeValueWorkerFinished | undefined {
        const row = resultCacheGetStatement.get(id) as { id: string, created_at: number, result: string };
        if (row) {
            return JSON.parse(row.result);
        }
    }

    resultCacheRemove(id: string): void | undefined {
        removeJobResultsFromCacheStatement.get(id);
    }
}

export const db = new DB();
