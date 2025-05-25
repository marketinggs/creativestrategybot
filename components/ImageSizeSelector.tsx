import React from 'react';
import { ImageSize, ImageSizeOption } from '../types';
import { IMAGE_SIZE_OPTIONS } from '../constants';

interface ImageSizeSelectorProps {
  selectedValue: ImageSize | null;
  onChange: (value: ImageSize) => void;
  disabled?: boolean;
  stepNumber: number;
}

const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({ selectedValue, onChange, disabled, stepNumber }) => {
  return (
    <div className="p-6 bg-[var(--gs-dark-grey-6)] rounded-xl shadow-lg h-full flex flex-col justify-center">
      <label htmlFor="image-size-select" className="block text-lg font-medium text-[var(--gs-mint)] mb-2">
        {stepNumber}. Select Image Size/Aspect Ratio
      </label>
      <select
        id="image-size-select"
        name="image-size"
        className={`mt-1 block w-full py-3 px-4 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--gs-mint)] focus:border-[var(--gs-mint)] sm:text-sm disabled:cursor-not-allowed ${
          disabled 
            ? 'border-[var(--gs-slate)] bg-[var(--gs-dark-grey-4)] text-[var(--gs-slate)] opacity-70' 
            : 'border-[var(--gs-slate)] bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)]'
        }`}
        value={selectedValue || ""}
        onChange={(e) => onChange(e.target.value as ImageSize)}
        disabled={disabled}
        aria-label="Select image size or aspect ratio"
      >
        <option value="" disabled>
          -- Select an image size --
        </option>
        {IMAGE_SIZE_OPTIONS.map((option: ImageSizeOption) => (
          <option key={option.value} value={option.value} className="bg-[var(--gs-bottle-green-lighter)] text-[var(--gs-off-white)]">
            {option.label}
          </option>
        ))}
      </select>
       {disabled && !selectedValue && (
         <p className="mt-2 text-xs text-[var(--gs-slate)]">
           Please complete previous steps.
         </p>
       )}
    </div>
  );
};

export default ImageSizeSelector;