import React from 'react';
import type { MarketOrderFormProps } from '@/lib/api/types/api';
import { formatPrice, formatKES, estimateCostKES, resolutionPayoutKES } from '@/lib/formatters';
import { useSellQuote } from '@/hooks/useTrade';

// Maximum trade amount in KES per trade
const MAX_TRADE_AMOUNT_KES = 5000;

/** Format a number as compact KES: KES 40K, KES 1.2M, etc. */
function formatCompactKES(value: number): string {
  if (value >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `KES ${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `KES ${value}`;
}

export function MarketOrderForm({
  market,
  currentPrices,
  userBalance,
  userPosition,
  onSubmit,
  onSellSubmit,
  tradeHook,
  sellHook,
  defaultOutcome = 'YES',
}: MarketOrderFormProps) {
  // ── State
  const [side, setSide] = React.useState<'BUY' | 'SELL'>('BUY');
  const [outcome, setOutcome] = React.useState<'YES' | 'NO'>(defaultOutcome);
  const [amountInput, setAmountInput] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [inputMode, setInputMode] = React.useState<'SHARES' | 'KES'>('SHARES');

  // ── Derived values
  const currentPrice =
    outcome === 'YES' ? currentPrices.yes_price : currentPrices.no_price;

  // How many shares the user holds for the selected outcome
  const heldShares =
    outcome === 'YES'
      ? userPosition?.yes_shares ?? 0
      : userPosition?.no_shares ?? 0;

  // Derive shares and cost based on input mode
  let sharesCount = 0;
  let totalCost = 0;

  if (inputMode === 'KES') {
    const kesAmount = parseFloat(amountInput) || 0;
    sharesCount = Math.floor(kesAmount / (currentPrice / 100));
    totalCost = kesAmount;
  } else {
    sharesCount = parseInt(amountInput) || 0;
    totalCost = estimateCostKES(sharesCount, currentPrice);
  }

  // Each share resolves at 1 KES (= 100 cents) per API spec
  const maxPayout = resolutionPayoutKES(sharesCount); // in KES

  // ── Validation
  const isOverLimit = totalCost > MAX_TRADE_AMOUNT_KES;

  // ── Handlers
  const handleSideSelect = (selected: 'BUY' | 'SELL') => {
    setSide(selected);
    setAmountInput('');
    setErrorMsg(null);
  };

  const handleOutcomeSelect = (selected: 'YES' | 'NO') => {
    setOutcome(selected);
    setAmountInput('');
    setErrorMsg(null);
  };

  const handleInputModeSelect = (mode: 'SHARES' | 'KES') => {
    setInputMode(mode);
    setAmountInput('');
    setErrorMsg(null);
  };

  // Fetch sell quote when side is SELL and we have shares
  const { data: sellQuote, isFetching: isFetchingQuote } = useSellQuote(
    market.id,
    outcome,
    side === 'SELL' && sharesCount > 0 ? sharesCount : 0
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const value = e.target.value;
    // KES mode allows decimals; shares mode integers only
    if (inputMode === 'KES') {
      if (/^\d*\.?\d{0,2}$/.test(value)) {
        setAmountInput(value);
      }
    } else {
      if (/^\d*$/.test(value)) {
        setAmountInput(value);
      }
    }
  };

  const handlePresetClick = (preset: '25%' | '50%' | '75%' | '100%') => {
    setErrorMsg(null);
    // SELL Presets: percentage of held shares
    let pct = 0;
    if (preset === '25%') pct = 0.25;
    else if (preset === '50%') pct = 0.50;
    else if (preset === '75%') pct = 0.75;
    else if (preset === '100%') pct = 1.00;

    const sharesToSell = Math.floor(heldShares * pct);
    setAmountInput(sharesToSell.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sharesCount < 1) {
      setErrorMsg('Shares must be at least 1');
      return;
    }

    if (side === 'SELL') {
      if (!onSellSubmit) {
        setErrorMsg('Selling is not configured.');
        return;
      }
      if (sharesCount > heldShares) {
        setErrorMsg('Insufficient shares to sell.');
        return;
      }
      
      onSellSubmit({
        outcome,
        shares: sharesCount,
        min_proceeds_kes: 0, // Can be improved with slippage logic based on sellQuote
      });
      return;
    }

    if (totalCost > MAX_TRADE_AMOUNT_KES) {
      setErrorMsg(`Trade amount exceeds maximum limit of KES ${MAX_TRADE_AMOUNT_KES}`);
      return;
    }

    if (userBalance !== null && totalCost > userBalance / 100) {
      setErrorMsg('Insufficient balance');
      return;
    }

    onSubmit({
      outcome,
      shares: sharesCount,
    });
  };

  // Sync API errors into local error state
  React.useEffect(() => {
    const error = tradeHook.error || sellHook?.error;
    if (error) {
      const timer = setTimeout(() => setErrorMsg(error.error), 0);
      return () => clearTimeout(timer);
    }
  }, [tradeHook.error, sellHook?.error]);

  // Track previous prices for delta indicators
  const prevYesRef = React.useRef(currentPrices.yes_price);
  const prevNoRef = React.useRef(currentPrices.no_price);

  React.useEffect(() => {
    prevYesRef.current = currentPrices.yes_price;
    prevNoRef.current = currentPrices.no_price;
  }, [currentPrices.yes_price, currentPrices.no_price]);

  const renderDelta = (current: number | string | undefined | null, prev: number | string | undefined | null) => {
    if (typeof current !== 'number' || typeof prev !== 'number') return null;
    if (current > prev) return <span className="text-[#00C853] text-xs" title="Price increased">▲</span>;
    if (current < prev) return <span className="text-[#FF1744] text-xs" title="Price decreased">▼</span>;
    return null;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-subtle rounded-xl p-6 shadow-xl w-full max-w-xl flex flex-col gap-4 text-primary transition-all duration-300 relative overflow-hidden"
    >
      {/* ── BUY / SELL Segmented Control */}
      <div className="flex bg-subtle p-1 rounded-lg w-full">
        <button
          type="button"
          onClick={() => handleSideSelect('BUY')}
          className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all cursor-pointer ${side === 'BUY'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
            }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => handleSideSelect('SELL')}
          className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all cursor-pointer ${side === 'SELL'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
            }`}
        >
          SELL
        </button>
      </div>

      {/* ── YES / NO Selector Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* YES */}
        <button
          type="button"
          onClick={() => handleOutcomeSelect('YES')}
          className={`flex flex-col gap-1.5 px-4 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${outcome === 'YES'
              ? 'border-yes-strong bg-yes-dim shadow-sm'
              : 'border-subtle bg-subtle/40 hover:border-yes-strong/40'
            }`}
        >
          <span className={`text-[11px] font-semibold tracking-widest uppercase ${outcome === 'YES' ? 'text-yes-strong' : 'text-muted-foreground/60'
            }`}>
            YES
          </span>
          <span className={`text-2xl font-bold tabular-nums leading-none flex items-center justify-center gap-1 ${outcome === 'YES' ? 'text-yes-strong' : 'text-primary/50'
            }`}>
            {typeof currentPrices.yes_price === 'number' ? formatPrice(currentPrices.yes_price) : '--'}
            {renderDelta(currentPrices.yes_price, prevYesRef.current)}
          </span>
        </button>

        {/* NO */}
        <button
          type="button"
          onClick={() => handleOutcomeSelect('NO')}
          className={`flex flex-col gap-1.5 px-4 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${outcome === 'NO'
              ? 'border-no-strong bg-no-dim shadow-sm'
              : 'border-subtle bg-subtle/40 hover:border-no-strong/40'
            }`}
        >
          <span className={`text-[11px] font-semibold tracking-widest uppercase ${outcome === 'NO' ? 'text-no-strong' : 'text-muted-foreground/60'
            }`}>
            NO
          </span>
          <span className={`text-2xl font-bold tabular-nums leading-none flex items-center justify-center gap-1 ${outcome === 'NO' ? 'text-no-strong' : 'text-primary/50'
            }`}>
            {typeof currentPrices.no_price === 'number' ? formatPrice(currentPrices.no_price) : '--'}
            {renderDelta(currentPrices.no_price, prevNoRef.current)}
          </span>
          {/* ── Position Strip — only when the user holds shares */}
      {userPosition && (userPosition.yes_shares > 0 || userPosition.no_shares > 0) && (() => {
        const shares = outcome === 'YES' ? userPosition.yes_shares : userPosition.no_shares;
        const price = outcome === 'YES' ? (currentPrices.yes_price ?? 50) : (currentPrices.no_price ?? 50);
        const pnl = (shares * price * 100) - (userPosition.cost_basis ?? 0);
        const isGain = pnl >= 0;
        if (shares <= 0) return null;
        return (
          <div className={`flex items-center justify-between px-4 py-2 border rounded-lg text-xs font-mono tabular-nums overflow-hidden ${side === 'SELL' ? 'bg-accent-blue/10 border-accent-blue/30' : 'bg-subtle border-subtle-border'}`}>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={outcome === 'YES' ? 'text-yes-strong font-semibold' : 'text-no-strong font-semibold'}>
                {outcome}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-primary/90">{shares.toLocaleString()} <span className="text-muted-foreground text-[10px]">owned</span></span>
            </div>
            <div className={`font-semibold whitespace-nowrap pl-2 ${isGain ? 'text-yes-strong' : 'text-no-strong'}`}>
              {isGain ? '+' : '-'}{formatCompactKES(Math.abs(pnl))}
            </div>
          </div>
        );
      })()}
        </button>
      </div>

      {/* ── KES / Shares Mode Toggle */}
      {side === 'BUY' ? (
        <div className="flex bg-subtle p-1 rounded-lg w-full">
          <button
            type="button"
            onClick={() => handleInputModeSelect('SHARES')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${inputMode === 'SHARES'
                ? 'bg-surface text-primary border border-subtle-border shadow-sm'
                : 'text-muted-foreground hover:text-primary'
              }`}
          >
            Shares
          </button>
          <button
            type="button"
            onClick={() => handleInputModeSelect('KES')}
            className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${inputMode === 'KES'
                ? 'bg-surface text-primary border border-subtle-border shadow-sm'
                : 'text-muted-foreground hover:text-primary'
              }`}
          >
            KES
          </button>
        </div>
      ) : null}

      {/* ── Input Box */}
      <div
        className="relative border border-subtle-border rounded-xl bg-subtle px-4 pt-3 pb-4 focus-within:border-active transition-colors cursor-text"
        onClick={() => document.getElementById('amount-input')?.focus()}
      >
        {/* Top row: label only */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {inputMode === 'KES' ? 'Amount (KES)' : 'Shares'}
          </span>
        </div>

        {/* Large amount input — right-aligned */}
        <input
          id="amount-input"
          type="text"
          inputMode={inputMode === 'KES' ? 'decimal' : 'numeric'}
          placeholder="0"
          value={amountInput}
          onChange={handleAmountChange}
          className="w-full bg-transparent border-0 p-0 text-3xl font-bold text-right text-primary placeholder-muted-foreground/30 outline-none focus:ring-0 font-mono tracking-tight"
        />
      </div>

      {/* ── Presets Row (SELL only) */}
      {side === 'SELL' && (
        <div className="flex gap-2 flex-wrap">
          {(['25%', '50%', '75%', '100%'] as const).map((pct) => (
            <button
              key={pct}
              type="button"
              disabled={heldShares <= 0}
              onClick={() => handlePresetClick(pct)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-subtle-border bg-subtle hover:border-active text-xs font-semibold text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-center"
            >
              {pct}
            </button>
          ))}
        </div>
      )}

      {/* ── Payout Info (Kalshi-style plain rows) */}
      <div className="space-y-3 px-1">
        {/* Odds row */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Odds</span>
          <span className="text-primary font-semibold">{currentPrice.toFixed(1)}% chance</span>
        </div>

        {side === 'BUY' ? (
          <>
            {/* Payout row */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                Payout if {outcome}
                <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </span>
              <span className={`text-xl font-bold font-mono ${outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                } ${isOverLimit ? 'opacity-40' : ''}`}>
                {formatKES(maxPayout)}
              </span>
            </div>

            {/* Contextual hint */}
            {sharesCount > 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {inputMode === 'KES' ? (
                  <>
                    KES <span className="font-semibold text-primary">{(parseFloat(amountInput) || 0).toFixed(2)}</span>
                    {' → ~'}
                    <span className="font-semibold text-primary">{sharesCount} shares</span>
                    {' at '}
                    <span className="font-semibold text-primary">{formatPrice(currentPrice)}</span>
                    {'. Payout if right: '}
                    <span className={`font-semibold ${outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                      }`}>{formatKES(maxPayout)}</span>.
                  </>
                ) : (
                  <>
                    You&apos;re buying{' '}
                    <span className="font-semibold text-primary">{sharesCount} contracts</span>{' '}
                    at{' '}
                    <span className="font-semibold text-primary">{formatPrice(currentPrice)}</span>{' '}
                    each. If you&apos;re right, payout is{' '}
                    <span className={`font-semibold ${outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                      }`}>{formatKES(maxPayout)}</span>.
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          /* SELL Mode Info */
          <>
            {sharesCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  Est. Proceeds
                </span>
                <span className="text-xl font-bold font-mono text-accent-blue flex items-center gap-2">
                  {isFetchingQuote ? (
                    <svg className="animate-spin h-5 w-5 text-accent-blue opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  {sellQuote ? formatKES(sellQuote.projected_kes) : formatKES(0)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Cost Breakdown */}
      {sharesCount > 0 && side === 'BUY' && (
        <div className="flex justify-between items-center px-1 border-t border-subtle pt-3">
          <span className="text-xs text-muted-foreground">Estimated Cost</span>
          <span className="text-xs font-semibold text-primary font-mono">{formatKES(totalCost)}</span>
        </div>
      )}

      {/* ── Error Display */}
      {errorMsg && (
        <div className="text-error text-xs font-semibold px-2 py-1 bg-no-dim border border-no-strong/20 rounded-lg animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* ── Submit Button */}
      <button
        type="submit"
        disabled={sharesCount < 1 || (side === 'BUY' && isOverLimit) || (side === 'SELL' && sharesCount > heldShares) || (side === 'SELL' && isFetchingQuote)}
        className={`w-full py-3.5 rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer ${
          side === 'SELL'
            ? 'bg-accent-blue text-white hover:bg-accent-blue/90 active:scale-[0.99]'
            : outcome === 'YES'
            ? 'bg-yes-strong text-black hover:bg-yes-strong/95 active:scale-[0.99]'
            : 'bg-no-strong text-white hover:bg-no-strong/95 active:scale-[0.99]'
        }`}
      >
        {side === 'SELL'
          ? sharesCount > heldShares 
            ? 'Insufficient shares'
            : isFetchingQuote
            ? 'Calculating...'
            : `Sell ${outcome} — ~${sellQuote ? formatKES(sellQuote.projected_kes) : formatKES(0)}`
          : isOverLimit
          ? `Limit exceeded (max KES ${MAX_TRADE_AMOUNT_KES})`
          : inputMode === 'KES'
          ? `Buy ${outcome} — ~${sharesCount} shares`
          : `Buy ${outcome} Shares — ${formatKES(totalCost)}`}
      </button>
    </form>
  );
}