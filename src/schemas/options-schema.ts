/**
 * Options - the choices people add to a room.
 * Anyone signed in can add one; only the person who added it can edit or delete it.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const optionsSchema: CollectionSchema = {
  name: 'options',
  columns: [
    { name: 'roomId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'label', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
