export * from './types';
export * from './reimbursements';
export * from './purchases';
export * from './cash';
export * from './stats';

import { reimbursementApi } from './reimbursements';
import { purchaseApi } from './purchases';
import { cashApi } from './cash';
import { statsApi } from './stats';

export const financeApi = {
  ...reimbursementApi,
  ...purchaseApi,
  ...cashApi,
  ...statsApi,
};
