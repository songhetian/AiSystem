export * from './types';
export * from './reimbursements';
export * from './purchases';
export * from './cash';

import { reimbursementApi } from './reimbursements';
import { purchaseApi } from './purchases';
import { cashApi } from './cash';

export const financeApi = {
  ...reimbursementApi,
  ...purchaseApi,
  ...cashApi,
};
