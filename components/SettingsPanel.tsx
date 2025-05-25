
import React, { useState } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentReferenceSystemPrompt: string;
  onReferenceSystemPromptChange: (newPrompt: string) => void;
  currentFreshSystemPrompt: string;
  onFreshSystemPromptChange: (newPrompt: string) => void;
  currentOpenAiApiKey: string;
  onOpenAiApiKeyChange: (newKey: string) => void;
  onOpenWorkshopManagement: () => void; // Prop name kept for now, functionality in App.tsx refers to "Product"
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  currentReferenceSystemPrompt,
  onReferenceSystemPromptChange,
  currentFreshSystemPrompt,
  onFreshSystemPromptChange,
  currentOpenAiApiKey,
  onOpenAiApiKeyChange,
  onOpenWorkshopManagement,
}) => {
  const [localOpenAiKey, setLocalOpenAiKey] = useState(currentOpenAiApiKey);

  if (!isOpen) {
    return null;
  }

  const handleOpenAiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalOpenAiKey(e.target.value);
  };

  const handleOpenAiKeySave = () => {
    onOpenAiApiKeyChange(localOpenAiKey.trim());
  };


  return (
    <div 
      className="fixed inset-0 bg-[var(--gs-black-pearl)] bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-panel-title"
    >
      <div 
        className="bg-[var(--gs-dark-grey-6)] p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-panel-title" className="text-2xl font-semibold text-[var(--gs-mint)]">
            Application Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--gs-slate)] hover:text-[var(--gs-off-white)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--gs-mint)]"
            aria-label="Close settings panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-medium text-[var(--gs-off-white)] mb-2">OpenAI API Key</h3>
            <p className="text-sm text-[var(--gs-slate)] mb-1">
              Enter your OpenAI API key here for static ad image generation.
            </p>
             <p className="text-xs text-yellow-400 mb-2">
              <strong>Security Warning:</strong> Storing API keys in browser localStorage has security risks. This key will only be stored on your local browser. For production or shared environments, a backend proxy is recommended.
            </p>
            <div className="flex items-center space-x-2">
                <input
                type="password"
                value={localOpenAiKey}
                onChange={handleOpenAiKeyInputChange}
                className="flex-grow p-3 bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)] border border-[var(--gs-slate)] rounded-md focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)]"
                placeholder="Enter your OpenAI API key (e.g., sk-...)"
                aria-label="OpenAI API Key input"
                />
                <button
                    onClick={handleOpenAiKeySave}
                    className="px-4 py-2 bg-[var(--gs-mint)] hover:bg-[var(--gs-mint-darker)] text-[var(--gs-tide-white)] font-semibold rounded-lg shadow-md transition-colors text-sm"
                >
                    Save Key
                </button>
            </div>
          </div>

           <div>
            <h3 className="text-xl font-medium text-[var(--gs-off-white)] mb-2">Product Data (Supabase)</h3>
            <p className="text-sm text-[var(--gs-slate)] mb-3">
              Add, edit, or delete product details (Workshops/IPs) and associated PDF documents. This data is stored in your Supabase project.
            </p>
            <button
              onClick={() => {
                onOpenWorkshopManagement(); 
                onClose(); 
              }}
              className="w-full px-6 py-3 bg-[var(--gs-mint)] hover:bg-[var(--gs-mint-darker)] text-[var(--gs-tide-white)] font-semibold rounded-lg shadow-md transition-colors"
            >
              Manage Product Data
            </button>
          </div>


          <div>
            <h3 className="text-xl font-medium text-[var(--gs-off-white)] mb-2">Reference Mode System Prompt (Gemini)</h3>
            <p className="text-sm text-[var(--gs-slate)] mb-2">
              Guides Gemini AI for adapting uploaded video scripts or analyzing reference images for prompts.
            </p>
            <textarea
              value={currentReferenceSystemPrompt}
              onChange={(e) => onReferenceSystemPromptChange(e.target.value)}
              className="w-full h-40 p-3 bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)] border border-[var(--gs-slate)] rounded-md focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)] resize-y"
              aria-label="Reference Mode system prompt editor"
            />
          </div>

          <div>
            <h3 className="text-xl font-medium text-[var(--gs-off-white)] mb-2">Fresh Script Mode System Prompt (Gemini)</h3>
            <p className="text-sm text-[var(--gs-slate)] mb-2">
              Guides Gemini AI for generating new video scripts or image prompts based on product details.
            </p>
            <textarea
              value={currentFreshSystemPrompt}
              onChange={(e) => onFreshSystemPromptChange(e.target.value)}
              className="w-full h-40 p-3 bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)] border border-[var(--gs-slate)] rounded-md focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)] resize-y"
              aria-label="Fresh Script Mode system prompt editor"
            />
          </div>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[var(--gs-slate)] hover:bg-[var(--gs-dark-grey-4)] text-[var(--gs-tide-white)] font-semibold rounded-lg shadow-md transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
