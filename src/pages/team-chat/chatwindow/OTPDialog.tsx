import React, { useEffect, useRef, useState } from "react";
import {
  KeyRound,
  Wallet,
  RefreshCcw,
  CreditCard,
  ArrowLeft,
  ChevronRight,
  Send,
  X,
  Loader2,
} from "lucide-react";

const requestTypes = [
  {
    id: "qpay-removal",
    title: "QPay removal",
    hint: "Take a QPay payment off the bill",
    icon: Wallet,
  },
  {
    id: "refund",
    title: "Refund",
    hint: "Return money to the customer",
    icon: RefreshCcw,
  },
  {
    id: "payment-type",
    title: "Payment type change",
    hint: "Switch how the bill was paid",
    icon: CreditCard,
  },
];

const MAX_NOTES = 500;
const MAX_OTPS = 3;

type OTPRequest = {
  type: string;
  amount: number;
  otpCount: number;
  storeId: string;
  storeName: string;
  notes: string;
};

type OTPStore = {
  id: string;
  name: string;
};

type OTPflowProps = {
  onSubmit?: (request: OTPRequest) => void | Promise<void>;
  currentStore?: OTPStore;
  stores?: OTPStore[];
};

export default function OTPflow({
  onSubmit,
  currentStore = { id: "", name: "" },
  stores = [],
}: OTPflowProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState("");
  const [amount, setAmount] = useState("");
  const [otpCount, setOtpCount] = useState("1");
  const [selectedStoreId, setSelectedStoreId] = useState(currentStore.id);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setSelectedStoreId(currentStore.id);
  }, [currentStore.id]);

  const reset = () => {
    setStep(1);
    setSelectedType("");
    setAmount("");
    setOtpCount("1");
    setSelectedStoreId(currentStore.id);
    setNotes("");
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const selected = requestTypes.find((item) => item.id === selectedType);
  const parsedOtpCount = Number(otpCount);
  const hasValidOtpCount =
    Number.isInteger(parsedOtpCount) && parsedOtpCount >= 1 && parsedOtpCount <= MAX_OTPS;
  const storeOptions = stores.filter((store) => store.id && store.name.trim());
  const selectedStore =
    storeOptions.find((store) => store.id === selectedStoreId) ?? currentStore;
  const normalizedCurrentStore = selectedStore.name.trim();
  const canSubmit =
    !!amount &&
    Number(amount) > 0 &&
    hasValidOtpCount &&
    !!selectedStore.id &&
    !!normalizedCurrentStore &&
    !!notes.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedType || !canSubmit) {
      setError(
        normalizedCurrentStore
          ? `Enter an amount above 0, choose 1-${MAX_OTPS} OTPs, and add a reason.`
          : "Your user account does not have a current store assigned.",
      );
      return;
    }

    try {
      setSending(true);
      setError("");
      await onSubmit?.({
        type: selectedType,
        amount: Number(amount),
        otpCount: parsedOtpCount,
        storeId: selectedStore.id,
        storeName: normalizedCurrentStore,
        notes: notes.trim(),
      });
      close();
    } catch {
      setError("Couldn't send the request. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      {/* Place this trigger where your existing key icon is */}
      <button
        type="button"
        title="Request OTP"
        aria-label="Request OTP"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
          open
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <KeyRound className="h-[18px] w-[18px] text-current stroke-[2.5]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Request OTP"
          className="absolute bottom-full right-0 z-[100] mb-2 w-[300px] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none dark:ring-white/5"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
            {step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                className="-ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Back to request types"
              >
                <ArrowLeft size={15} />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">
                {step === 1 ? "Request an OTP" : selected?.title}
              </p>
              <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                {step === 1 ? "What do you need approved?" : "Add the amount and why it's needed"}
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {step === 1 ? (
            <ul className="p-1.5">
              {requestTypes.map(({ id, title, hint, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType(id);
                      setStep(2);
                      setError("");
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {hint}
                      </span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <form onSubmit={submit} className="space-y-2.5 p-3">
              <div className="space-y-1.5">
                <label htmlFor="otp-amount" className="text-xs font-medium">
                  Amount
                </label>
                <div className="flex h-9 items-center overflow-hidden rounded-lg border bg-background transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                  <span className="flex h-full w-8 items-center justify-center border-r bg-muted/50 text-muted-foreground">
                    $
                  </span>
                  <input
                    id="otp-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    required
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-full w-full bg-transparent px-3 text-sm font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="otp-count" className="text-xs font-medium">
                  How many OTPs are needed?
                </label>
                <select
                  id="otp-count"
                  required
                  value={otpCount}
                  onChange={(e) => setOtpCount(e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium tabular-nums outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {Array.from({ length: MAX_OTPS }, (_, index) => {
                    const count = String(index + 1);
                    return (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="otp-current-store" className="text-xs font-medium">
                  Current store
                </label>
                {storeOptions.length > 1 ? (
                  <select
                    id="otp-current-store"
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    {storeOptions.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="otp-current-store"
                    type="text"
                    readOnly
                    value={normalizedCurrentStore || "No store assigned"}
                    className="h-9 w-full rounded-lg border bg-muted/40 px-3 text-sm font-medium text-muted-foreground outline-none"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="otp-notes" className="text-xs font-medium">
                    Reason
                  </label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {notes.length}/{MAX_NOTES}
                  </span>
                </div>
                <textarea
                  id="otp-notes"
                  required
                  rows={2}
                  maxLength={MAX_NOTES}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why is this needed?"
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-snug outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !canSubmit}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                {sending ? "Sending request" : "Send request"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
