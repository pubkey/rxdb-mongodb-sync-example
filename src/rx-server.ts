import {
    createRxDatabase,
    addRxPlugin,
    defaultConflictHandler,
    prepareQuery
} from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsNodeNative
} from 'rxdb/plugins/storage-sqlite';
import { replicateMongoDB } from 'rxdb/plugins/replication-mongodb';
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';
import { MongoClient } from 'mongodb';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { TODO_SCHEMA } from './schema';
import { CONFIG } from '../config';
import { DatabaseSync } from 'node:sqlite';


async function start() {
    addRxPlugin(RxDBDevModePlugin);
    const storage = wrappedValidateAjvStorage({
        storage: getRxStorageSQLiteTrial({
            sqliteBasics: getSQLiteBasicsNodeNative(DatabaseSync)
        })
    });
    console.log('START 0');

    const mongoClient = new MongoClient(CONFIG.mongodb.connection);
    const mongoDatabase = mongoClient.db(CONFIG.mongodb.databaseName);
    console.log('START 0.1');
    const mongoCollection = await mongoDatabase.createCollection(CONFIG.mongodb.collectionName, {
        changeStreamPreAndPostImages: { enabled: true }
    });
    console.log('START 0.2');

    // Create server-side RxDB instance
    const db = await createRxDatabase({
        name: 'serverdb',
        storage: storage,
        multiInstance: false
    });

    // Add your collection schema
    await db.addCollections({
        todos: {
            schema: TODO_SCHEMA,
            conflictHandler: {
                isEqual: (a, b, c) => {
                    const ret = defaultConflictHandler.isEqual(a, b, c);
                    console.log('isEqul::::');
                    console.log(JSON.stringify({
                        a, b, c, ret
                    }, null, 4));
                    return ret;
                },
                resolve: async (i, c) => {
                    const ret = await defaultConflictHandler.resolve(i, c);
                    console.log(JSON.stringify({ ret, i, c }));
                    return ret;
                }
            }
        }
    });

    console.log('START 1');
    console.dir(TODO_SCHEMA);

    const replicationState = replicateMongoDB({
        mongodb: {
            connection: CONFIG.mongodb.connection,
            databaseName: CONFIG.mongodb.databaseName,
            collectionName: CONFIG.mongodb.collectionName,
        },
        collection: db.todos,
        replicationIdentifier: 'todos-mongodb-sync',
        pull: {
            batchSize: 50,
            modifier: d => {
                // console.log('pulling');
                // console.dir(d);
                return d;
            }
        },
        push: {
            batchSize: 50,
            modifier: d => {
                // console.log('pushing');
                // console.dir(d);
                return d;
            }
        },
        live: true
    });
    console.log('START 2');
    replicationState.error$.subscribe(err => {
        console.log('Got replication error:');
        console.dir(err);
        console.error(err);
    });
    await replicationState.awaitInSync();
    console.log('START 3');

    await logStates();

    const server = await createRxServer({
        database: db,
        adapter: RxServerAdapterExpress,
        port: 9090,
        cors: 'http://localhost:8080'
    });

    console.log('START 4');
    const endpoint = server.addReplicationEndpoint({
        name: 'todos',
        collection: db.todos,
        cors: 'http://localhost:8080'
    });
    console.log('START 4.5');
    console.log('Replication endpoint:', `http://localhost:9090/${endpoint.urlPath}`);
    console.log('START 5');

    // do not forget to start the server!
    await server.start();
    console.log('SERVER STARTED!');


    setInterval(async () => {
        await logStates();
    }, 2000);





    setInterval(async () => {
        // console.log('insertOne:');
        // await mongoCollection.insertOne({
        //     id: 'auto_' + Date.now(),
        //     name: 'server created todo at ' + new Date().toLocaleString(),
        //     state: 'open',
        //     lastChange: Date.now()
        // });
    }, 15000);


    async function logStates() {

        const [mongoCloudDocs, rxServerdocs] = await Promise.all([
            await mongoCollection.find().toArray(),
            db.todos.storageInstance.query(prepareQuery(
                db.todos.storageInstance.schema,
                {
                    selector: {},
                    skip: 0,
                    sort: [{ [db.todos.schema.primaryPath]: 'asc' }]
                }
            ))
        ]);

        console.log('STATE:');
        console.log(JSON.stringify({
            mongoCloudDocs,
            rxServerdocs
        }, null, 4));
    }


}
start();


