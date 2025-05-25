
import React from 'react';
import { ProductOption } from '../types'; // Changed from WorkshopOption

interface WorkshopSelectorProps {
  options: ProductOption[]; // Changed from WorkshopOption[]
  selectedProductId: string | null; // Renamed from selectedValue
  onChange: (value: string) => void;
  disabled?: boolean;
  stepNumber: number;
}

const WorkshopSelector: React.FC<WorkshopSelectorProps> = ({ options, selectedProductId, onChange, disabled, stepNumber }) => {
  return (
    <div className="p-6 bg-[var(--gs-dark-grey-6)] rounded-xl shadow-lg h-full flex flex-col justify-center">
      <label htmlFor="product-select" className="block text-lg font-medium text-[var(--gs-mint)] mb-2">
        {stepNumber}. Select Product (Workshop/IP)
      </label>
      <select
        id="product-select"
        name="product"
        className={`mt-1 block w-full py-3 px-4 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)] sm:text-sm disabled:cursor-not-allowed ${
          disabled 
            ? 'border-[var(--gs-slate)] bg-[var(--gs-dark-grey-4)] text-[var(--gs-slate)] opacity-70' 
            : 'border-[var(--gs-slate)] bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)]'
        }`}
        value={selectedProductId || ""} // Changed
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Select product type (Workshop or IP)"
      >
        <option value="" disabled>
          -- Select a product --
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)]">
            {option.label}
          </option>
        ))}
      </select>
       {disabled && !selectedProductId && ( // Changed
         <p className="mt-2 text-xs text-[var(--gs-slate)]">
           {stepNumber === 2 ? "Please complete previous steps first." : "Product selection is disabled."}
         </p>
       )}
    </div>
  );
};

export default WorkshopSelector;
