const {
    MongoClient
} = require('mongodb');
const { CONFIG } = require('../config.js');

/**
 * This file connects to the mongoDB database
 * and does an insert.
 * It is used in the CI to await the time it takes
 * the database containers to start up.
 */
async function run() {
    console.log('MongoDB Tester: start ' + CONFIG.mongodb.connection);
    const mongoClient = new MongoClient(CONFIG.mongodb.connection);
    console.log('MongoDB Tester: created client');
    await mongoClient.connect();
    console.log('MongoDB Tester: client connected');
    const admin = mongoClient.db('admin');

    try {
        const result = await admin.command({ replSetInitiate: {} });
        console.log('MongoDB Tester: started replica set');
        console.dir(result);
    } catch (err) {
        if (err.codeName === 'AlreadyInitialized' || (err.code && err.code === 23)) {
            // 23 is the error code for AlreadyInitialized
            console.log('MongoDB Tester: replica set already initialized, continuing...');
        } else {
            throw err;
        }
    }


    const start = Date.now();
    while (true) {
        const status = await admin.command({ replSetGetStatus: 1 });
        if (status.myState === 1) { // 1 = PRIMARY
            console.log('Node is PRIMARY');
            break;
        }
        const timeoutMs = 30_000;
        if (Date.now() - start > timeoutMs) {
            throw new Error('Timed out waiting for PRIMARY');
        }
        await new Promise(r => setTimeout(r, 500));
    }
    console.log('MongoDB Tester: replica set is now primary');



    const mongoDatabase = mongoClient.db(CONFIG.mongodb.databaseName);
    console.log('MongoDB Tester: db connected');
    const mongoCollection = await mongoDatabase.createCollection(CONFIG.mongodb.collectionName, {
        changeStreamPreAndPostImages: { enabled: true }
    });
    console.log('MongoDB Tester: created collection');
    // await mongoCollection.insertOne({ foo: 'bar' });

    console.log('MongoDB Tester: DONE');

    await mongoClient.close();
}
run();
