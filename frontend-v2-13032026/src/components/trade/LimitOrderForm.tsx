import React from 'react';
import type { Market, Position } from '@/lib/api/types/api';
import { formatPrice } from '@/lib/formatters';

// Maximum trade amount in KES per trade
const MAX_TRADE_AMOUNT_KES = 5000;

// Quick-fill options in KES
const QUICK_FILL_OPTIONS = [130, 648, 1296, 2592] as const;

// Expiry options for limit orders
const EXPIRY_OPTIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: 'GTC', label: 'Good Till Cancelled' },
] as const;

export interface LimitOrderFormProps {
  market: Market;
  currentPrices: { yes_price: number; no_price: number };
  userBalance: number | null;
  userPosition?: Position | null;
  onSubmit: (params: {
    marketId: string;
    outcome: 'YES' | 'NO';
    shares: number;
    triggerPrice: number;
    expiry: '1h' | '24h' | '7d' | 'GTC';
  }) => void;
  tradeHook: ReturnType<typeof import('@/hooks/useTrade').useTrade>;
}

export function LimitOrderForm({
  market,
  currentPrices,
  userBalance,
  userPosition,
  onSubmit,
  tradeHook,
}: LimitOrderFormProps) {
  // ── State
  const [outcome, setOutcome] = React.useState<'YES' | 'NO'>('YES');
  const [shares, setShares] = React.useState<number>(0);
  const [triggerPrice, setTriggerPrice] = React.useState<number>(0);
  const [expiry, setExpiry] = React.useState<'1h' | '24h' | '7d' | 'GTC'>('24h');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // ── Derived values
  const currentPrice =
    outcome === 'YES' ? currentPrices.yes_price : currentPrices.no_price;

  // Use trigger price for calculations (what user wants to pay), fallback to current price
  const effectivePrice = triggerPrice > 0 ? triggerPrice : currentPrice;
  const estimatedCost = shares * effectivePrice;
  const estimatedPayout = shares * 100;
  const estimatedProfit = estimatedPayout - estimatedCost;

  // How many shares the user holds for the selected outcome
  const heldShares =
    outcome === 'YES'
      ? userPosition?.yes_shares ?? 0
      : userPosition?.no_shares ?? 0;

  // ── Validation
  const isOverLimit = estimatedCost > MAX_TRADE_AMOUNT_KES;
  const isPriceValid = triggerPrice > 0 && triggerPrice <= 100;

  // ── Handlers
  const handleOutcomeSelect = (selected: 'YES' | 'NO') => {
    setOutcome(selected);
    setErrorMsg(null);
    // Reset trigger price when outcome changes to avoid confusion
    setTriggerPrice(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (shares < 1) {
      setErrorMsg('Shares must be at least 1');
      return;
    }

    if (!isPriceValid) {
      setErrorMsg('Trigger price must be between 0.01 and 100');
      return;
    }

    if (estimatedCost > MAX_TRADE_AMOUNT_KES) {
      setErrorMsg(`Trade amount exceeds maximum limit of KES ${MAX_TRADE_AMOUNT_KES}`);
      return;
    }

    onSubmit({
      marketId: market.id,
      outcome,
      shares,
      triggerPrice,
      expiry,
    });
  };

  // Sync API errors into local error state
  React.useEffect(() => {
    if (tradeHook.error) {
      setErrorMsg(tradeHook.error.error);
    }
  }, [tradeHook.error]);

  // ── Pill styles
  const pillBase =
    'inline-flex items-center px-4 py-2 rounded-md border font-mono font-bold text-lg gap-2 cursor-pointer transition select-none text-primary';
  const yesPill = `${pillBase} bg-yes-dim border-[rgba(0,200,83,0.35)] ${
    outcome === 'YES' ? 'ring-2 ring-yes-strong' : 'opacity-60'
  }`;
  const noPill = `${pillBase} bg-no-dim border-[rgba(255,23,68,0.35)] ${
    outcome === 'NO' ? 'ring-2 ring-no-strong' : 'opacity-60'
  }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-subtle rounded-lg p-6 shadow-lg w-full max-w-xl flex flex-col gap-6 text-primary"
    >
      {/* ── Outcome pills */}
      <div>
        <div className="text-body-md font-semibold mb-3">Select your prediction</div>
        <div className="flex items-center gap-3">
          <span
            className={yesPill}
            tabIndex={0}
            role="button"
            aria-pressed={outcome === 'YES'}
            onClick={() => handleOutcomeSelect('YES')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleOutcomeSelect('YES');
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 3v12M9 3l-4 4M9 3l4 4"
                stroke="#00c853"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Yes{' '}
            {typeof currentPrices.yes_price === 'number'
              ? formatPrice(currentPrices.yes_price, 'percent')
              : '--'}
          </span>

          <span
            className={noPill}
            tabIndex={0}
            role="button"
            aria-pressed={outcome === 'NO'}
            onClick={() => handleOutcomeSelect('NO')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleOutcomeSelect('NO');
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 15V3M9 15l-4-4M9 15l4-4"
                stroke="#ff1744"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No{' '}
            {typeof currentPrices.no_price === 'number'
              ? formatPrice(currentPrices.no_price, 'percent')
              : '--'}
          </span>
        </div>
      </div>

      {/* ── Trigger Price input */}
      <div>
        <label htmlFor="triggerPrice" className="block text-sm font-medium mb-1 text-primary">
          Trigger Price{' '}
          <span className="text-muted text-xs">(order executes when price reaches this)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="triggerPrice"
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            value={triggerPrice === 0 ? '' : triggerPrice}
            placeholder={`Current: ${currentPrice.toFixed(2)}`}
            onChange={(e) => setTriggerPrice(Number(e.target.value))}
            className="w-full border border-subtle rounded px-3 py-2 font-mono text-lg text-primary"
          />
          <span className="text-body-md font-semibold whitespace-nowrap">cents (0-100)</span>
        </div>
        <p className="text-xs text-muted mt-1">
          Current {outcome} price: {currentPrice.toFixed(2)}¢
        </p>
      </div>

      {/* ── Shares input */}
      <div>
        <label htmlFor="shares" className="block text-sm font-medium mb-1 text-primary">
          Shares{' '}
          <span className="text-primary text-xs">
            (you hold {heldShares} {outcome})
          </span>
        </label>
        <input
          id="shares"
          type="number"
          min={1}
          value={shares === 0 ? '' : shares}
          placeholder="0"
          onChange={(e) => setShares(Number(e.target.value))}
          className="w-full border border-subtle rounded px-3 py-2 font-mono text-lg text-primary"
        />

        {/* Quick-fill buttons */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {QUICK_FILL_OPTIONS.map((val) => {
            const approxShares = effectivePrice > 0 ? Math.floor(val / effectivePrice) : 0;
            const wouldExceedLimit = val > MAX_TRADE_AMOUNT_KES;
            return (
              <button
                key={val}
                type="button"
                disabled={wouldExceedLimit}
                className={`px-3 py-1 rounded border border-subtle font-mono text-sm ${
                  wouldExceedLimit
                    ? 'bg-muted text-muted cursor-not-allowed opacity-50'
                    : 'bg-subtle text-primary'
                }`}
                onClick={() => {
                  setShares((prev) => prev + approxShares);
                }}
              >
                ~KES {val}
              </button>
            );
          })}
          <button
            type="button"
            className="px-3 py-1 rounded border border-subtle bg-subtle text-primary font-mono text-sm"
            onClick={() => {
              const maxSharesByLimit =
                effectivePrice > 0 ? Math.floor(MAX_TRADE_AMOUNT_KES / effectivePrice) : 0;
              const maxSharesByBalance =
                userBalance && effectivePrice > 0
                  ? Math.floor(userBalance / effectivePrice)
                  : 0;
              setShares(Math.min(maxSharesByLimit, maxSharesByBalance));
            }}
          >
            Max
          </button>
        </div>
        <p className="text-xs text-muted mt-1">
          Maximum trade amount: KES {MAX_TRADE_AMOUNT_KES.toLocaleString()}
        </p>
      </div>

      {/* ── Expiry selection */}
      <div>
        <label htmlFor="expiry" className="block text-sm font-medium mb-2 text-primary">
          Order Expiry
        </label>
        <div className="flex gap-2 flex-wrap">
          {EXPIRY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`px-4 py-2 rounded font-bold transition ${
                expiry === option.value
                  ? 'bg-primary text-white'
                  : 'bg-subtle text-primary border border-subtle'
              }`}
              onClick={() => setExpiry(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Payout preview */}
      <div className="bg-subtle rounded-lg p-4 text-primary">
        <div className="flex justify-between items-center mb-2">
          <span className="text-body-md font-semibold text-primary">Estimated cost</span>
          <span className={`font-bold text-lg ${isOverLimit ? 'text-error' : 'text-primary'}`}>
            KES {estimatedCost.toFixed(2)}
            {isOverLimit && (
              <span className="text-error text-sm ml-2">(exceeds limit)</span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-body-md font-semibold text-primary">
            Payout if {outcome} wins
          </span>
          <span className="font-bold text-success text-lg text-primary">
            KES {estimatedPayout.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-body-md font-semibold text-primary">Potential profit</span>
          <span
            className={`font-bold text-lg ${
              estimatedProfit >= 0 ? 'text-success' : 'text-error'
            } text-primary`}
          >
            {estimatedProfit >= 0 ? '+' : ''}KES {estimatedProfit.toFixed(2)}
          </span>
        </div>
        <div className="flex gap-3 mt-3 flex-nowrap">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-yes-strong shadow-sm gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#00c853" />
              <text x="10" y="14" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Y</text>
            </svg>
            <span className="font-bold text-yes-strong">YES</span>
            <span className="font-mono text-base font-bold text-yes-strong">{currentPrices.yes_price.toFixed(2)}¢</span>
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-no-strong shadow-sm gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#ff1744" />
              <text x="10" y="14" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">N</text>
            </svg>
            <span className="font-bold text-no-strong">NO</span>
            <span className="font-mono text-base font-bold text-no-strong">{currentPrices.no_price.toFixed(2)}¢</span>
          </span>
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-primary shadow-sm gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#1976d2" />
              <text x="10" y="14" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">₵</text>
            </svg>
            <span className="font-bold text-primary">Payout</span>
            <span className="font-mono text-base font-bold text-primary">KES 100</span>
          </span>
        </div>
      </div>

      {/* ── Error */}
      {errorMsg && (
        <div className="text-error text-sm font-semibold">{errorMsg}</div>
      )}

      {/* ── Submit */}
      <button
        type="submit"
        className="bg-primary text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition"
        disabled={tradeHook.isPending || shares < 1 || !isPriceValid || isOverLimit}
      >
        {tradeHook.isPending
          ? 'Placing order…'
          : isOverLimit
            ? `Limit exceeded (max KES ${MAX_TRADE_AMOUNT_KES})`
            : !isPriceValid && triggerPrice > 0
              ? 'Invalid trigger price'
              : `Place Limit Order: ${shares > 0 ? shares : ''} ${outcome} @ ${triggerPrice.toFixed(2)}¢`}
      </button>
    </form>
  );
}
