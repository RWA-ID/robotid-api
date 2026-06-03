import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-http/lib/use/express';
import type { Hex } from 'viem';
import { config, requireAddress } from './lib/config.js';
import { publicClient } from './lib/viem.js';
import { ROBOT_IDENTITY_ABI, SUBSCRIPTION_ABI, TIER_NAMES } from './lib/contracts.js';

const typeDefs = /* GraphQL */ `
  type Robot {
    tokenId: String!
    owner: String!
    manufacturer: String!
    model: String!
    capabilityClass: String!
    firmwareVersion: Int!
    locked: Boolean!
    tokenURI: String!
  }

  type Subscription {
    address: String!
    active: Boolean!
    tier: Int!
    tierName: String!
    expiry: Int!
  }

  type Query {
    robot(tokenId: String!): Robot
    subscription(address: String!): Subscription
    totalMinted: String!
  }
`;

const resolvers = {
  Query: {
    robot: async (_: unknown, { tokenId }: { tokenId: string }) => {
      const identity = requireAddress('robotIdentity');
      const id = BigInt(tokenId);
      const [owner, uri, data] = await Promise.all([
        publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'ownerOf', args: [id] }),
        publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'tokenURI', args: [id] }),
        publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'robots', args: [id] }),
      ]);
      return {
        tokenId, owner, tokenURI: uri,
        manufacturer: data[1], model: data[2], capabilityClass: data[3],
        firmwareVersion: Number(data[4]), locked: data[6],
      };
    },
    subscription: async (_: unknown, { address }: { address: string }) => {
      const sub = requireAddress('subscription');
      const addr = address as Hex;
      const [active, tier, expiry] = await Promise.all([
        publicClient.readContract({ address: sub, abi: SUBSCRIPTION_ABI, functionName: 'isActive', args: [addr] }),
        publicClient.readContract({ address: sub, abi: SUBSCRIPTION_ABI, functionName: 'tierOf', args: [addr] }),
        publicClient.readContract({ address: sub, abi: SUBSCRIPTION_ABI, functionName: 'expiry', args: [addr] }),
      ]);
      return { address, active, tier: Number(tier), tierName: TIER_NAMES[Number(tier)], expiry: Number(expiry) };
    },
    totalMinted: async () => {
      const identity = config.addresses.robotIdentity;
      if (!identity) return '0';
      const n = await publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'totalMinted' });
      return n.toString();
    },
  },
};

export const graphqlHandler = createHandler({ schema: makeExecutableSchema({ typeDefs, resolvers }) });
