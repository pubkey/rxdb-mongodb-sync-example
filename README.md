# RxDB MongoDB Sync Example

Example Repo that runs the RxDB-MongoDB Replication.

## Prerequisites

- Ensure you have installed Docker
- Ensure you have installed Node.js in version 22 or newer


## Starting this Project

- Clone the repository
- Run `npm install`
- Run `npm run mongodb:start` (leave that console open)
- In a fresh console run `npm run mongodb:init` (this creates the MongoDB Database and Collection)
- In a fresh console run `npm run rx-server` (leave that console open)
- In a fresh console run `npm run frontend` (leave that console open)
- Open [http://localhost:8080/](http://localhost:8080/) in your browser. Use Incognito Tabs to simulate multiple devices.
