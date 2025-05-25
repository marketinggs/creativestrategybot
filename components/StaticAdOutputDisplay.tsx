import React, { useState } from 'react';
import { GeneratedStaticAd } from '../types';

interface StaticAdOutputDisplayProps {
  ads: GeneratedStaticAd[];
}

const StaticAdOutputDisplay: React.FC<StaticAdOutputDisplayProps> = ({ ads }) => {
  const [copySuccessPrompt, setCopySuccessPrompt] = useState<string | false>(false);

  if (!ads || ads.length === 0) {
    return null;
  }

  const handleCopyPrompt = async (promptText: string, adId: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopySuccessPrompt(adId);
      setTimeout(() => setCopySuccessPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      alert('Failed to copy prompt.');
    }
  };

  return (
    <section className="mt-10 w-full bg-[var(--gs-dark-grey-6)] p-6 sm:p-8 rounded-xl shadow-xl space-y-8">
      <h2 className="text-3xl font-bold mb-2 text-center text-[var(--gs-mint)]">
        Generated Static Ad Creative
      </h2>
      {ads.map((ad) => (
        <div key={ad.id} className="bg-[var(--gs-black-pearl)] p-4 sm:p-6 rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold text-[var(--gs-off-white)] mb-3">Ad Creative Output</h3>
          
          {ad.referenceAnalysis && (
            <div className="mb-4">
              <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-1">Reference Image Analysis:</h4>
              <p className="p-3 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-slate)] text-sm whitespace-pre-wrap break-words">
                {ad.referenceAnalysis}
              </p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-lg font-medium text-[var(--gs-mint)]">Generated Image:</h4>
                 <button 
                    onClick={() => handleCopyPrompt(ad.promptUsed, ad.id)}
                    className="text-xs text-[var(--gs-mint)] hover:text-[var(--gs-mint-darker)] py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--gs-mint)]"
                    aria-live="polite"
                >
                    {copySuccessPrompt === ad.id ? 'Prompt Copied!' : 'Copy Prompt Used'}
                </button>
            </div>
            <div className="flex justify-center items-center bg-[var(--gs-dark-grey-4)] p-3 rounded-md">
              <img 
                src={ad.imageUrl} 
                alt="Generated static ad" 
                className="max-w-full max-h-[400px] h-auto rounded shadow-md object-contain" 
              />
            </div>
          </div>

          <div className="mb-2">
            <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-1">Prompt Used for Image Generation:</h4>
            <p className="p-3 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm whitespace-pre-wrap break-words">
              {ad.promptUsed}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default StaticAdOutputDisplay;