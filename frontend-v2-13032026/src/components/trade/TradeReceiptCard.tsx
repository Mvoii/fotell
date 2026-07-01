import React from 'react';
import type { TradeReceipt, SellReceipt } from '@/lib/api/types/api';
import { formatCentsAsKES, formatPrice } from '@/lib/formatters';

interface TradeReceiptCardProps {
  receipt: TradeReceipt | SellReceipt;
  onClose: () => void;
}

export function TradeReceiptCard({ receipt, onClose }: TradeReceiptCardProps) {
  const isSell = 'proceeds_paid' in receipt;
  return (
    <div className="bg-surface rounded-lg overflow-hidden border border-success/30 animate-in fade-in zoom-in duration-300">
      <div className="bg-success/10 p-4 border-b border-success/20 flex items-center justify-center">
        <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="heading-lg text-success">Trade Success!</h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-subtle border-dashed">
          <span className="text-muted-foreground text-sm">Outcome</span>
          <span className={`font-bold px-2 py-0.5 rounded text-sm ${receipt.outcome === 'YES' ? 'bg-yes-dim text-yes-strong' : 'bg-no-dim text-no-strong'
            }`}>
            {receipt.outcome}
          </span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-subtle border-dashed">
          <span className="text-muted-foreground text-sm">{isSell ? 'Shares Sold' : 'Shares Purchased'}</span>
          <span className="text-primary font-mono font-bold">{receipt.shares}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-subtle border-dashed">
          <span className="text-muted-foreground text-sm">Average Price</span>
          <span className="text-primary font-mono font-bold">{formatPrice(receipt.avg_price)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-subtle border-dashed">
          <span className="text-muted-foreground text-sm">{isSell ? 'Total Proceeds' : 'Total Paid'}</span>
          <span className="text-primary font-bold">{formatCentsAsKES(isSell ? (receipt as SellReceipt).proceeds_paid : (receipt as TradeReceipt).cost_paid)}</span>
        </div>

        <div className="bg-subtle/50 rounded-md p-3 flex justify-between items-center">
          <span className="text-muted-foreground text-xs">New Balance</span>
          <span className="text-primary font-semibold text-sm">{formatCentsAsKES(receipt.balance_after)}</span>
        </div>

        <div className="text-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest pt-2">
          Receipt ID: {receipt.trade_id.slice(0, 8)}...
        </div>
      </div>

      <div className="p-4 border-t border-subtle bg-base">
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
