
import React, { useState, useEffect } from 'react';
import { RewrittenScriptVariation, ScriptHook, ScriptMode } from '../types';

interface ScriptOutputDisplayProps {
  scripts: RewrittenScriptVariation[];
  mode: ScriptMode;
}

const ScriptOutputDisplay: React.FC<ScriptOutputDisplayProps> = ({ scripts, mode }) => {
  const [activeDurationId, setActiveDurationId] = useState<string | null>(null);
  const [selectedHookIds, setSelectedHookIds] = useState<{ [durationId: string]: string | null }>({});
  const [copySuccess, setCopySuccess] = useState<string | false>(false); // Store ID of copied script or false

  useEffect(() => {
    if (scripts && scripts.length > 0) {
      const firstScriptId = scripts[0].id;
      setActiveDurationId(firstScriptId); // In reference mode, this will be the ID of the single script

      const initialHookIds: { [scriptId: string]: string | null } = {};
      scripts.forEach(script => {
        if (script.hooks && script.hooks.length > 0) {
          initialHookIds[script.id] = script.hooks[0].id;
        } else {
          initialHookIds[script.id] = null;
        }
      });
      setSelectedHookIds(initialHookIds);
    } else {
      setActiveDurationId(null);
      setSelectedHookIds({});
    }
  }, [scripts, mode]);

  if (!scripts || scripts.length === 0) {
    return null;
  }

  // For Reference Mode, always use the first (and only) script
  const activeScriptVariation = mode === 'reference' ? scripts[0] : scripts.find(s => s.id === activeDurationId);
  
  if (!activeScriptVariation) return null;

  const selectedHookIdForActiveScript = selectedHookIds[activeScriptVariation.id];
  const selectedHook = activeScriptVariation.hooks.find(h => h.id === selectedHookIdForActiveScript);

  const handleCopyFullScript = async (scriptToCopy: RewrittenScriptVariation, hookToUse?: ScriptHook) => {
    if (!scriptToCopy) return;
    const hookText = hookToUse ? hookToUse.text : (scriptToCopy.hooks[0]?.text || "No specific hook selected/available.");
    const fullScript = `Hook:\n${hookText}\n\nScript Body:\n${scriptToCopy.body}\n\nCTA:\n${scriptToCopy.cta}`;
    try {
      await navigator.clipboard.writeText(fullScript);
      setCopySuccess(scriptToCopy.id); // Indicate which script was copied
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy full script:', err);
      alert('Failed to copy script.');
    }
  };
  
  const handleHookSelection = (scriptId: string, hookId: string) => {
    setSelectedHookIds(prev => ({ ...prev, [scriptId]: hookId }));
  };

  if (mode === 'reference') {
    const script = scripts[0]; // Should only be one script
    const mainHook = script.hooks && script.hooks.length > 0 ? script.hooks[0] : null;
    return (
      <section className="mt-10 w-full bg-[var(--gs-dark-grey-6)] p-6 sm:p-8 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-[var(--gs-mint)]">
          Adapted Script
        </h2>
        <div className="bg-[var(--gs-black-pearl)] p-4 sm:p-6 rounded-lg shadow-inner space-y-5">
           <div className="flex justify-end">
             <button 
                onClick={() => handleCopyFullScript(script, mainHook || undefined)}
                className="text-sm text-[var(--gs-mint)] hover:text-[var(--gs-mint-darker)] py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--gs-mint)]"
                aria-live="polite"
            >
                {copySuccess === script.id ? 'Copied!' : 'Copy Full Script'}
            </button>
           </div>

          {mainHook && (
            <div>
              <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Suggested Hook:</h4>
              <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base whitespace-pre-wrap break-words">
                {mainHook.text}
              </div>
            </div>
          )}
           {!mainHook && script.hooks.length === 0 && (
             <div>
                <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Hook:</h4>
                 <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-slate)] italic text-sm sm:text-base">
                    No specific hook provided in adaptation, check script body for opening.
                </div>
            </div>
           )}


          <div>
            <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Adapted Script Body:</h4>
            <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base min-h-[10em] whitespace-pre-wrap break-words">
              {script.body}
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Suggested CTA:</h4>
            <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base whitespace-pre-wrap break-words">
              {script.cta}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Fresh Script Mode (existing UI)
  return (
    <section className="mt-10 w-full bg-[var(--gs-dark-grey-6)] p-6 sm:p-8 rounded-xl shadow-xl">
      <h2 className="text-3xl font-bold mb-2 text-center text-[var(--gs-mint)]">
        Generated Scripts
      </h2>
      <p className="text-center text-[var(--gs-slate)] mb-6">
        Choose between different script lengths and hook options
      </p>

      <div className="mb-6 flex justify-center space-x-2 sm:space-x-4 bg-[var(--gs-dark-grey-4)] p-1 rounded-lg">
        {scripts.map((script) => (
          <button
            key={script.id}
            onClick={() => setActiveDurationId(script.id)}
            className={`px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-md transition-all duration-200 ease-in-out
              ${activeDurationId === script.id 
                ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] shadow-lg' 
                : 'bg-transparent text-[var(--gs-slate)] hover:bg-[var(--gs-bottle-green-lighter)] hover:text-[var(--gs-off-white)]'
              }`
            }
            aria-pressed={activeDurationId === script.id}
          >
            {script.durationLabel || 'Script'}
          </button>
        ))}
      </div>

      {activeScriptVariation && (
        <div className="bg-[var(--gs-black-pearl)] p-4 sm:p-6 rounded-lg shadow-inner">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
              <div>
                  <h3 className="text-2xl font-semibold text-[var(--gs-off-white)]">{activeScriptVariation.versionTitle || 'Script Details'}</h3>
                  {activeScriptVariation.description && <p className="text-sm text-[var(--gs-slate)]">{activeScriptVariation.description}</p>}
              </div>
          </div>
          
          <div className="mb-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
                  <h4 className="text-lg font-medium text-[var(--gs-mint)]">Hook Options</h4>
                  <button 
                      onClick={() => handleCopyFullScript(activeScriptVariation, selectedHook || undefined)}
                      className="text-sm text-[var(--gs-mint)] hover:text-[var(--gs-mint-darker)] mt-2 sm:mt-0 py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--gs-mint)]"
                      aria-live="polite"
                  >
                      {copySuccess === activeScriptVariation.id ? 'Copied!' : 'Copy Full Script'}
                  </button>
              </div>
            {activeScriptVariation.hooks.length > 0 ? (
                <>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {activeScriptVariation.hooks.map((hook, index) => (
                        <button
                            key={hook.id}
                            onClick={() => handleHookSelection(activeScriptVariation.id, hook.id)}
                            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md border transition-all duration-200 ease-in-out
                            ${selectedHookIdForActiveScript === hook.id
                                ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] border-[var(--gs-mint)] shadow-md'
                                : 'bg-[var(--gs-dark-grey-4)] text-[var(--gs-off-white)] border-[var(--gs-slate)] hover:border-[var(--gs-mint)] hover:bg-[var(--gs-bottle-green-lighter)]'
                            }`
                            }
                            aria-pressed={selectedHookIdForActiveScript === hook.id}
                        >
                            Option {index + 1}
                        </button>
                        ))}
                    </div>
                    {selectedHook && (
                        <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base min-h-[4em] whitespace-pre-wrap break-words">
                        {selectedHook.text}
                        </div>
                    )}
                    {!selectedHook && (
                        <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-slate)] italic text-sm sm:text-base min-h-[4em]">
                        Select a hook option to view its text.
                        </div>
                    )}
                </>
            ) : (
                 <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-slate)] italic text-sm sm:text-base min-h-[4em]">
                    No specific hook options provided for this variation.
                </div>
            )}
          </div>

          <div className="mb-4">
            <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Script Body</h4>
            <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base min-h-[8em] whitespace-pre-wrap break-words">
              {activeScriptVariation.body}
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-lg font-medium text-[var(--gs-mint)] mb-2">Suggested CTA</h4>
            <div className="p-3 sm:p-4 bg-[var(--gs-dark-grey-4)] rounded-md text-[var(--gs-off-white)] text-sm sm:text-base min-h-[3em] whitespace-pre-wrap break-words">
              {activeScriptVariation.cta}
            </div>
          </div>

          {activeScriptVariation.estimatedDurationText && (
            <p className="text-xs text-right text-[var(--gs-slate)] mt-4">
              {activeScriptVariation.estimatedDurationText}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ScriptOutputDisplay;
