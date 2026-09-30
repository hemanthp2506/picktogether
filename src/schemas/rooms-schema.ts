/**
 * Rooms - one decision question that a group votes on.
 * Anyone signed in can read a room (sharing the link is how you invite people);
 * only the creator can edit or delete it.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const roomsSchema: CollectionSchema = {
  name: 'rooms',
  columns: [
    { name: 'question', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
