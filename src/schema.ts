import { RxJsonSchema } from 'rxdb/plugins/core';

export type TodoDocType = {
    id: string;
    name: string;
    state: 'open' | 'done';
    lastChange: number;
}

export const TODO_SCHEMA = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 20
        },
        name: {
            type: 'string'
        },
        state: {
            type: 'string',
            enum: [
                'open',
                'done'
            ],
            maxLength: 10
        },
        lastChange: {
            type: 'number',
            minimum: 0,
            maximum: 2701307494132,
            multipleOf: 1
        }
    },
    required: ['id', 'name', 'state', 'lastChange'],
    indexes: [
        'state',
        ['state', 'lastChange']
    ]
} as RxJsonSchema<TodoDocType>
