import { z } from 'zod';

import { stellarPublicKeySchema } from '../auth/wallet-auth.ts';

const amountSchema = z.string().trim().regex(/^(0|[1-9]\d*)(?:\.\d{1,7})?$/, 'Enter a decimal amount with up to seven places.');
const positiveAmountSchema = amountSchema.refine((value) => !/^0(?:\.0+)?$/.test(value), 'Amount must be greater than zero.');
const memoSchema = z.string().refine((value) => Buffer.byteLength(value, 'utf8') <= 28, 'Memo must be at most 28 bytes.').optional();
const assetSchema = z.enum(['XLM', 'USDC']);

export const idempotencyKeySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/, 'Invalid Idempotency-Key.');

const stellarQuoteUnion = z.discriminatedUnion('operationType', [
  z.object({
    operationType: z.literal('PAYMENT'),
    destination: stellarPublicKeySchema,
    assetCode: assetSchema,
    amount: positiveAmountSchema,
    memo: memoSchema
  }).strict(),
  z.object({
    operationType: z.literal('CHANGE_TRUST'),
    assetCode: z.literal('USDC'),
    limit: amountSchema,
    memo: memoSchema
  }).strict(),
  z.object({
    operationType: z.literal('PATH_PAYMENT_STRICT_SEND'),
    sendAssetCode: assetSchema,
    sendAmount: positiveAmountSchema,
    destinationAssetCode: assetSchema,
    slippageBps: z.number().int().min(1).max(500),
    memo: memoSchema
  }).strict()
]);

export const stellarQuoteSchema = stellarQuoteUnion.superRefine((value, context) => {
  if (value.operationType === 'PATH_PAYMENT_STRICT_SEND' && value.sendAssetCode === value.destinationAssetCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Swap assets must be different.', path: ['destinationAssetCode'] });
  }
});

export const signedXdrSchema = z.object({ signedXdr: z.string().trim().min(32).max(20_000) }).strict();
export const intentParamsSchema = z.object({ id: z.string().min(8).max(64) });

export type StellarQuoteRequest = z.infer<typeof stellarQuoteSchema>;
