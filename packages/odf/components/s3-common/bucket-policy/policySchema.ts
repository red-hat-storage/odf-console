export const policySchema = {
  type: 'object',
  required: ['Version', 'Statement'],
  properties: {
    Version: {
      type: 'string',
      enum: ['2012-10-17'],
    },
    Statement: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Effect', 'Action', 'Resource', 'Principal'],
        properties: {
          Effect: { type: 'string', enum: ['Allow', 'Deny'] },
          Action: { type: ['string', 'array'] },
          Resource: { type: ['string', 'array'] },
          Principal: { type: ['string', 'object'] },
        },
      },
    },
  },
};
