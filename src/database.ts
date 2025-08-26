import {
    RxCollection,
    createRxDatabase,
    defaultHashSha256,
    addRxPlugin,
    randomToken,
    RxDocument,
    deepEqual,
    RxConflictHandler,
    RXDB_VERSION,
    RxStorage,
    defaultConflictHandler
} from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { TODO_SCHEMA, TodoDocType } from './schema.js';
import { replicateServer } from 'rxdb-server/plugins/replication-server';

export type RxTodoDocument = RxDocument<TodoDocType>;

// set by webpack as global
declare var mode: 'production' | 'development';
console.log('mode: ' + mode);

let storage: RxStorage<any, any> = getRxStorageDexie();

export const databasePromise = (async () => {
    // import dev-mode plugins
    if (mode === 'development') {
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module.RxDBDevModePlugin)
        );
        await import('rxdb/plugins/validate-ajv').then(
            module => {
                storage = module.wrappedValidateAjvStorage({ storage });
            }
        );
    }

    const database = await createRxDatabase<{
        todos: RxCollection<TodoDocType, {}>
    }>({
        name: 'tpdp-' + RXDB_VERSION.replace(/\./g, '-'),
        storage
    });

    await database.addCollections({
        todos: {
            schema: TODO_SCHEMA
        }
    });
    database.todos.preSave(d => {
        d.lastChange = Date.now();
        return d;
    }, true);
    await database.todos.bulkInsert(
        [
            'touch your 👃 with your 👅',
            'solve rubik\'s cube 🎲 blindfolded',
            'invent new 🍔'
        ].map((name, idx) => ({
            id: 'todo-' + idx,
            name,
            lastChange: 0,
            state: 'open'
        }))
    );


    console.log('DatabaseService: start ongoing replication');
    const ongoingReplication = replicateServer({
        replicationIdentifier: 'mongodb-client-side-sync',
        collection: database.todos,
        url: 'http://localhost:9090/todos/0',
        live: true,
        pull: {},
        push: {}
    });
    ongoingReplication.error$.subscribe(err => {
        console.log('Got replication error:');
        console.dir(err);
        console.error(err);
    });

    return database;
})();
