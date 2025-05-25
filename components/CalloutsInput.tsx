
import React from 'react';

interface CalloutsInputProps {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  stepNumber: number;
}

const CalloutsInput: React.FC<CalloutsInputProps> = ({ value, onChange, disabled, stepNumber }) => {
  return (
    <div className="p-6 bg-[var(--gs-dark-grey-6)] rounded-xl shadow-lg w-full">
      <label htmlFor="callouts-input" className="block text-lg font-medium text-[var(--gs-mint)] mb-2">
        {stepNumber}. Any particular call outs? <span className="text-sm text-[var(--gs-slate)]">(Optional)</span>
      </label>
      <textarea
        id="callouts-input"
        name="callouts"
        rows={3}
        className={`mt-1 block w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)] sm:text-sm resize-y disabled:cursor-not-allowed ${
          disabled 
            ? 'border-[var(--gs-slate)] bg-[var(--gs-dark-grey-4)] text-[var(--gs-slate)] opacity-70' 
            : 'border-[var(--gs-slate)] bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)]'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="E.g., Emphasize the no-code aspect, target audience is CEOs, make the tone more urgent..."
        aria-label="Any particular call outs or specific instructions for the AI"
      />
      {disabled && ( // Simplified disabled message; App.tsx controls precise conditions
        <p className="mt-2 text-xs text-[var(--gs-slate)]">
          Please complete previous steps first, or check API key configurations.
        </p>
      )}
    </div>
  );
};

export default CalloutsInput;
