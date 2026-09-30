/**
 * Votes - one vote per person per room.
 * `userId` is filled in by the server (userBound), so nobody can vote as someone
 * else, and `uniqueOn` stops a second vote in the same room. Changing your vote
 * means updating `optionId` on your existing vote.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const votesSchema: CollectionSchema = {
  name: 'votes',
  columns: [
    { name: 'roomId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'optionId', storage: 'text', interpretation: 'plain', required: true },
  ],
  uniqueOn: ['roomId', 'userId'],
  ownerField: 'userId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
