import React, { useState } from 'react';

interface PricingModalProps {
  onCancel: () => void;
  onSubscribe: () => void;
}

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const CardIcon = ({ brand }: { brand: string }) => {
    const icons: { [key: string]: string } = {
        visa: "https://js.stripe.com/v3/fingerprinted/img/visa-729c21b653a91e7c703135c11030e3f2.svg",
        mastercard: "https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg",
        amex: "https://js.stripe.com/v3/fingerprinted/img/amex-a0f25a7d7d079633e6f9b33a55288062.svg",
    };
    return <img src={icons[brand]} alt={brand} className="h-6" />;
}

const PayPalIcon = () => (
    <svg className="h-5 w-5" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>PayPal</title><path d="M7.076 21.337H2.478l-.122-.606 2.11-12.356h4.417c.28 0 .524.139.673.386.133.223.164.493.078.744l-2.11 12.356-.37.478zm14.49-12.742c0 .247-.02.48-.06.702-.033.18-.078.352-.133.513-.05.153-.11.294-.18.423-.07.13-.15.247-.24.352l-.203.23-.18.18-.222.18c-.078.06-.164.11-.253.153-.09.04-.18.07-.27.09-.09.02-.18.03-.27.04-.09.01-.173.02-.253.02h-.089s-.089 0-.133-.01c-.045-.01-.09-.01-.133-.02l-.18-.04c-.06-.02-.122-.03-.18-.05s-.11-.05-.164-.08c-.056-.03-.102-.06-.156-.09-.045-.03-.09-.06-.133-.09-.045-.03-.08-.06-.122-.08-.04-.03-.08-.05-.122-.08-.04-.03-.07-.05-.11-.08-.04-.03-.07-.05-.11-.08l-.133-.09-.11-.09-.11-.09c-.04-.03-.07-.06-.1-.09-.03-.03-.06-.06-.08-.08l-.062-.08c-.02-.02-.045-.05-.06-.07-.02-.02-.03-.04-.05-.06l-.03-.06c-.01-.02-.02-.04-.03-.06-.01-.02-.02-.04-.02-.06l-.02-.08c0-.02-.01-.04-.01-.06v-.01-.02l.02-.16.03-.15.05-.17.06-.15c.02-.05.05-.09.07-.14.02-.05.05-.09.08-.13l.08-.13c.03-.05.07-.09.1-.13.03-.04.07-.08.1-.11.03-.03.07-.06.1-.09.03-.03.07-.06.1-.08.04-.03.07-.05.11-.07.04-.02.08-.05.122-.07.04-.02.08-.04.122-.06l.133-.06c.05-.02.09-.04.14-.06.05-.02.1-.03.15-.05.05-.01.1-.03.15-.04l.164-.04c.05-.01.1-.02.15-.03l.164-.03c.056-.01.11-.01.164-.02l.173-.02c.11 0 .223.01.33.02.11.01.223.02.33.04.11.02.223.04.33.07.11.03.213.06.31.1.1.04.19.08.28.13.09.05.18.1.26.16.08.06.16.12.23.19.07.07.14.14.2.21l.17.21.11.16c.03.05.06.1.09.15l.07.16c.02.05.04.11.06.16.02.05.03.11.05.16l.03.14.02.11.01.14c.01.04.01.09.01.13zm-4.145-2.261c.24-1.39-1.282-2.45-2.73-2.45h-1.336l.49-2.85h2.95c.28 0 .524.139.673.386.133.223.164.493.078.744l-.334 1.956c2.262.09 3.428 1.5 2.76 3.483-.49 1.48-1.956 2.25-3.568 2.25h-2.31l-.224 1.307c-.06.35.01.62.19.82.18.19.42.28.7.28h.557c.28 0 .523.138.673.385.132.223.164.493.078.744l-.5 2.923c-.09.524-.49 1.09-1.336 1.09h-3.483c-.28 0-.524-.139-.673-.386-.133-.222-.164-.493-.078-.743l2.11-12.357.37-.478h.089c.045 0 .09.01.134.01.044.01.088.01.133.02h.045c.067.01.133.03.2.04.066.02.133.03.2.05.066.02.122.04.18.06l.19.08c.06.03.122.06.18.09.06.03.11.07.164.1l.164.13c.05.04.1.09.15.13.05.05.09.1.133.15l.11.16c.02.04.05.07.07.11s.04.09.06.13a.93.93 0 0 1 .06.15c.02.05.03.1.05.15l.03.15.02.15c0 .05.01.1.01.15v.19c-.01.05-.02.1-.03.15l-.03.15c-.01.05-.03.1-.05.15-.02.05-.04.09-.06.13-.02.05-.05.09-.07.13l-.08.13c-.03.04-.06.09-.09.13-.03.04-.06.08-.1.11-.03.04-.06.07-.1.1-.03.03-.06.07-.1.1-.03.03-.06.06-.1.08-.03.03-.06.06-.09.08l-.11.08-.11.08c-.04.03-.08.05-.122.07l-.122.07c-.045.02-.09.04-.133.06-.045.02-.09.04-.133.05-.045.02-.09.03-.133.04-.045.01-.09.02-.134.03-.044.01-.088.02-.133.02h-.134c-.09 0-.178-.01-.267-.02l2.39-13.915zM14.07 2.002h4.55c.28 0 .523.138.673.385.132.223.164.493.078.744L17.26 15.5c-.09.523-.49 1.09-1.336 1.09h-3.483c-.28 0-.524-.139-.673-.386-.133-.222-.164-.493-.078-.743L14.07 2z"/></svg>
);


export function PricingModal({ onCancel, onSubscribe }: PricingModalProps) {
  const [view, setView] = useState<'pricing' | 'checkout'>('pricing');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCardSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsProcessing(true);
      // In a real app, this would handle payment processing.
      // Here, we just simulate a delay.
      setTimeout(() => {
        onSubscribe();
        setIsProcessing(false);
      }, 1500);
  }

  const handlePayPalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate the redirect/popup flow for PayPal
    setTimeout(() => {
        onSubscribe();
        setIsProcessing(false);
    }, 2500);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] shadow-2xl flex flex-col overflow-hidden">
        <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white/90">
            {view === 'pricing' ? 'Upgrade to Neura Pro' : 'Complete Your Purchase'}
          </h2>
          <button className="p-1.5 rounded-full hover:bg-white/5" onClick={onCancel} aria-label="Close" disabled={isProcessing}>✕</button>
        </header>

        {view === 'pricing' ? (
             <main className="flex-1 p-6">
                <p className="text-center text-white/70 mb-6">You've reached the 1-goal limit for the free plan. Upgrade to unlock unlimited access and advanced features.</p>
                <div className="border border-blue-400/30 bg-blue-500/10 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white">Neura Pro</h3>
                    <p className="text-white/60 mt-1">Everything you need to excel.</p>
                    <div className="text-4xl font-extrabold text-white my-4">$10 <span className="text-base font-normal text-white/50">/ month</span></div>

                    <ul className="space-y-3 text-white/90">
                        <li className="flex items-center gap-3"><CheckIcon /> Unlimited Goal Creation</li>
                        <li className="flex items-center gap-3"><CheckIcon /> Advanced Strategy Formulation</li>
                        <li className="flex items-center gap-3"><CheckIcon /> Image Generation with Neura Vision</li>
                        <li className="flex items-center gap-3"><CheckIcon /> Priority Support</li>
                    </ul>
                    
                    <button 
                        onClick={() => setView('checkout')}
                        className="w-full mt-6 px-5 py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200"
                    >
                        Upgrade to Pro
                    </button>
                </div>
            </main>
        ) : (
            <form onSubmit={handleCardSubmit}>
                <main className="p-6 space-y-4">
                    <button 
                      type="button" 
                      onClick={handlePayPalClick}
                      disabled={isProcessing}
                      className="w-full px-5 py-3 rounded-lg bg-[#0070ba] text-white font-semibold hover:bg-[#005ea6] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <PayPalIcon />
                          <span>PayPal</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center text-xs text-white/40">
                        <span className="flex-1 h-px bg-white/10"></span>
                        <span className="px-2">OR PAY WITH CARD</span>
                        <span className="flex-1 h-px bg-white/10"></span>
                    </div>
                     <div>
                        <label htmlFor="card-name" className="text-sm text-white/70 mb-1 block">Cardholder Name</label>
                        <input id="card-name" type="text" placeholder="Jane Doe" required className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white" disabled={isProcessing} />
                    </div>
                     <div>
                        <label htmlFor="card-number" className="text-sm text-white/70 mb-1 block">Card Number</label>
                        <div className="relative">
                            <input id="card-number" type="text" placeholder="•••• •••• •••• 4242" required className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white pr-24" disabled={isProcessing} />
                            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                                <CardIcon brand="visa" />
                                <CardIcon brand="mastercard" />
                                <CardIcon brand="amex" />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="expiry" className="text-sm text-white/70 mb-1 block">Expiry Date</label>
                            <input id="expiry" type="text" placeholder="MM / YY" required className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white" disabled={isProcessing} />
                        </div>
                         <div>
                            <label htmlFor="cvc" className="text-sm text-white/70 mb-1 block">CVC</label>
                            <input id="cvc" type="text" placeholder="123" required className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white" disabled={isProcessing} />
                        </div>
                    </div>
                </main>
                <footer className="p-4 bg-black/20 space-y-3">
                     <button 
                        type="submit"
                        disabled={isProcessing}
                        className="w-full px-5 py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? 'Processing...' : 'Pay $10.00'}
                    </button>
                    <button type="button" onClick={() => setView('pricing')} className="w-full text-center text-sm text-white/60 hover:text-white" disabled={isProcessing}>
                        Go Back
                    </button>
                </footer>
            </form>
        )}
      </div>
    </div>
  );
}