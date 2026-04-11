export function withIdempotencyKey(idempotencyKey?: string) {
  return idempotencyKey
    ? {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      }
    : undefined;
}
