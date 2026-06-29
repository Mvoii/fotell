import React from 'react';
import type { MarketOrderFormProps } from '@/lib/api/types/api';
import { formatPrice, formatKES, estimateCostKES, resolutionPayoutKES } from '@/lib/formatters';

// Maximum trade amount in KES per trade
const MAX_TRADE_AMOUNT_KES = 5000;

export function MarketOrderForm({
  market,
  currentPrices,
  userBalance,
  userPosition,
  onSubmit,
  tradeHook,
  defaultOutcome = 'YES',
}: MarketOrderFormProps) {
  void market; // referenced via MarketOrderFormProps but not used directly in JSX yet

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

    if (side === 'SELL') {
      setErrorMsg('Selling is not supported by API. Please hold shares until resolution.');
      return;
    }

    if (sharesCount < 1) {
      setErrorMsg('Shares must be at least 1');
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
    if (tradeHook.error) {
      const timer = setTimeout(() => setErrorMsg(tradeHook.error!.error), 0);
      return () => clearTimeout(timer);
    }
  }, [tradeHook.error]);

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
          className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all cursor-pointer ${
            side === 'BUY'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => handleSideSelect('SELL')}
          className={`flex-1 py-2 text-center text-sm font-bold rounded-md transition-all cursor-pointer ${
            side === 'SELL'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          SELL
        </button>
      </div>

      {/* ── YES / NO Selector Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* YES Button */}
        <button
          type="button"
          onClick={() => handleOutcomeSelect('YES')}
          className={`flex flex-col p-3.5 rounded-xl border font-bold transition-all duration-200 cursor-pointer ${
            outcome === 'YES'
              ? 'border-yes-strong bg-yes-dim ring-1.5 ring-yes-strong shadow-sm'
              : 'border-subtle bg-surface hover:border-yes-strong/40'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className={outcome === 'YES' ? 'text-yes-strong' : 'text-muted-foreground'}>
              YES
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              {typeof currentPrices.yes_price === 'number'
                ? formatPrice(currentPrices.yes_price)
                : '--'}
            </span>
          </div>
          {(userPosition?.yes_shares ?? 0) > 0 && (
            <div className="flex items-center justify-between w-full mt-1.5 text-[11px] font-medium font-mono tabular-nums tracking-tight">
              <span className="text-muted-foreground">Hold: {userPosition?.yes_shares.toLocaleString()}</span>
              <span className={
                (((userPosition?.yes_shares ?? 0) * (currentPrices.yes_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)) >= 0
                  ? 'text-yes-strong'
                  : 'text-no-strong'
              }>
                {(((userPosition?.yes_shares ?? 0) * (currentPrices.yes_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)) >= 0 ? '+' : ''}
                {formatKES((((userPosition?.yes_shares ?? 0) * (currentPrices.yes_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)))}
              </span>
            </div>
          )}
        </button>

        {/* NO Button */}
        <button
          type="button"
          onClick={() => handleOutcomeSelect('NO')}
          className={`flex flex-col p-3.5 rounded-xl border font-bold transition-all duration-200 cursor-pointer ${
            outcome === 'NO'
              ? 'border-no-strong bg-no-dim ring-1.5 ring-no-strong shadow-sm'
              : 'border-subtle bg-surface hover:border-no-strong/40'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className={outcome === 'NO' ? 'text-no-strong' : 'text-muted-foreground'}>
              NO
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              {typeof currentPrices.no_price === 'number'
                ? formatPrice(currentPrices.no_price)
                : '--'}
            </span>
          </div>
          {(userPosition?.no_shares ?? 0) > 0 && (
            <div className="flex items-center justify-between w-full mt-1.5 text-[11px] font-medium font-mono tabular-nums tracking-tight">
              <span className="text-muted-foreground">Hold: {userPosition?.no_shares.toLocaleString()}</span>
              <span className={
                (((userPosition?.no_shares ?? 0) * (currentPrices.no_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)) >= 0
                  ? 'text-yes-strong' // using yes-strong (green) for positive PnL even on NO button
                  : 'text-no-strong'
              }>
                {(((userPosition?.no_shares ?? 0) * (currentPrices.no_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)) >= 0 ? '+' : ''}
                {formatKES((((userPosition?.no_shares ?? 0) * (currentPrices.no_price ?? 50) * 100) - (userPosition?.cost_basis ?? 0)))}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* ── KES / Shares Mode Toggle */}
      <div className="flex bg-subtle p-1 rounded-lg w-full">
        <button
          type="button"
          onClick={() => handleInputModeSelect('SHARES')}
          className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
            inputMode === 'SHARES'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          Shares
        </button>
        <button
          type="button"
          onClick={() => handleInputModeSelect('KES')}
          className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
            inputMode === 'KES'
              ? 'bg-surface text-primary border border-subtle-border shadow-sm'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          KES
        </button>
      </div>

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

        {/* Payout row */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm flex items-center gap-1">
            Payout if {outcome}
            <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          </span>
          <span className={`text-xl font-bold font-mono ${
            outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
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
                <span className={`font-semibold ${
                  outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                }`}>{formatKES(maxPayout)}</span>.
              </>
            ) : (
              <>
                You&apos;re buying{' '}
                <span className="font-semibold text-primary">{sharesCount} contracts</span>{' '}
                at{' '}
                <span className="font-semibold text-primary">{formatPrice(currentPrice)}</span>{' '}
                each. If you&apos;re right, payout is{' '}
                <span className={`font-semibold ${
                  outcome === 'YES' ? 'text-yes-strong' : 'text-no-strong'
                }`}>{formatKES(maxPayout)}</span>.
              </>
            )}
          </p>
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
        disabled={sharesCount < 1 || isOverLimit || side === 'SELL'}
        className={`w-full py-3.5 rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer ${
          side === 'SELL'
            ? 'bg-accent-blue text-white'
            : outcome === 'YES'
            ? 'bg-yes-strong text-black hover:bg-yes-strong/95 active:scale-[0.99]'
            : 'bg-no-strong text-white hover:bg-no-strong/95 active:scale-[0.99]'
        }`}
      >
        {side === 'SELL'
          ? 'Selling is not supported by API'
          : isOverLimit
          ? `Limit exceeded (max KES ${MAX_TRADE_AMOUNT_KES})`
          : inputMode === 'KES'
          ? `Buy ${outcome} — ~${sharesCount} shares`
          : `Buy ${outcome} Shares — ${formatKES(totalCost)}`}
      </button>
    </form>
  );
}