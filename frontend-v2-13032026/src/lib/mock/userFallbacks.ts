import type { Position, UserTradesResponse } from '@/lib/api/types/api';

const MOCK_USER_ID = 'mock-user';
const now = Date.now();

export const MOCK_USER_TRADES: UserTradesResponse = {
  total: 4,
  trades: [
    {
      id: 'trade-1',
      user_id: MOCK_USER_ID,
      market_id: '1',
      outcome: 'YES',
      shares: 150,
      cost_paid: 7500,
      created_at: new Date(now - 3600000 * 2).toISOString(),
    },
    {
      id: 'trade-2',
      user_id: MOCK_USER_ID,
      market_id: '2',
      outcome: 'NO',
      shares: 200,
      cost_paid: 12000,
      created_at: new Date(now - 3600000 * 12).toISOString(),
    },
    {
      id: 'trade-3',
      user_id: MOCK_USER_ID,
      market_id: '3',
      outcome: 'YES',
      shares: 80,
      cost_paid: 4800,
      created_at: new Date(now - 86400000 * 2).toISOString(),
    },
    {
      id: 'trade-4',
      user_id: MOCK_USER_ID,
      market_id: '1',
      outcome: 'NO',
      shares: 50,
      cost_paid: 2750,
      created_at: new Date(now - 86400000 * 5).toISOString(),
    },
  ],
};

export const MOCK_USER_POSITIONS: Position[] = [
  {
    user_id: MOCK_USER_ID,
    market_id: '1',
    yes_shares: 150,
    no_shares: 50,
    cost_basis: 10250,
    realized_pnl: null,
    created_at: new Date(now - 86400000 * 10).toISOString(),
    updated_at: new Date(now - 3600000 * 2).toISOString(),
  },
  {
    user_id: MOCK_USER_ID,
    market_id: '2',
    yes_shares: 0,
    no_shares: 200,
    cost_basis: 12000,
    realized_pnl: null,
    created_at: new Date(now - 86400000 * 7).toISOString(),
    updated_at: new Date(now - 3600000 * 12).toISOString(),
  },
  {
    user_id: MOCK_USER_ID,
    market_id: '3',
    yes_shares: 80,
    no_shares: 0,
    cost_basis: 4800,
    realized_pnl: 250,
    created_at: new Date(now - 86400000 * 3).toISOString(),
    updated_at: new Date(now - 86400000 * 2).toISOString(),
  },
];
