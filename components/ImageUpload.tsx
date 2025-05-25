import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  stepNumber: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFileChange, disabled, stepNumber }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setFileName(file.name);
        onFileChange(file);
      } else {
        alert("Please upload a valid image file (e.g., PNG, JPG, WEBP).");
        setFileName(null);
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
      }
    } else {
      setFileName(null);
      onFileChange(null);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    onFileChange(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 bg-[var(--gs-dark-grey-6)] rounded-xl shadow-lg h-full flex flex-col justify-center">
      <label htmlFor="static-ad-upload-input" className="block text-lg font-medium text-[var(--gs-mint)] mb-2">
        {stepNumber}. Upload Reference Ad Image
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--gs-slate)] border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg 
            className="mx-auto h-12 w-12 text-[var(--gs-slate)]" 
            stroke="currentColor" 
            fill="none" 
            viewBox="0 0 24 24" 
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div className="flex items-center justify-center text-sm text-[var(--gs-slate)]">
            <label
              htmlFor="static-ad-upload-input"
              className={`relative cursor-pointer bg-[var(--gs-black-pearl)] rounded-md font-medium text-[var(--gs-mint)] hover:text-[var(--gs-mint-darker)] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--gs-dark-grey-6)] focus-within:ring-[var(--gs-mint)] p-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Upload an image</span>
              <input 
                id="static-ad-upload-input" 
                name="static-ad-upload-input" 
                type="file" 
                className="sr-only" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                disabled={disabled}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-[var(--gs-slate)]">PNG, JPG, WEBP up to 10MB</p>
        </div>
      </div>
      {fileName && (
        <div className="mt-3 text-sm text-[var(--gs-off-white)] bg-[var(--gs-dark-grey-4)] p-2 rounded flex justify-between items-center">
          <span>{fileName}</span>
          <button 
            onClick={handleRemoveFile} 
            className="ml-2 text-[var(--gs-lava)] hover:text-[var(--gs-lava-darker)] text-xs"
            disabled={disabled}
            aria-label={`Remove ${fileName}`}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;