
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkshopDetailedDoc, ProductCategory, WorkshopModule, WorkshopFAQ, SessionInfo } from '../types';
import { PRODUCT_CATEGORY_OPTIONS } from '../constants'; // Changed from WORKSHOP_OPTIONS
import { dbService } from '../services/dbService';
import { analyzePdfForProductDetails, ExtractedPdfProductData } from '../services/geminiService'; // Import new service

interface WorkshopManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkshopsUpdated: () => void; 
  isGeminiConfigured: boolean; // To enable/disable PDF analysis feature
}

const initialProductFormData = (): Omit<WorkshopDetailedDoc, 'pdfStoragePath' | 'pdfDownloadURL' | 'createdAt' | 'updatedAt'> => ({
  id: '', // Will be UUID for new, or existing ID for edit
  productCategory: ProductCategory.WORKSHOP, // Default category
  title: '',
  fullDescription: '',
  price: '',
  discountDeadline: '',
  benefits: [''],
  targetAudience: [''],
  learningObjectives: [''],
  modules: [{ title: '', content: '' }],
  sessions: [{ session: '', time: '', day: '', description: [''] }],
  mentors: [''],
  targetAudienceDeepDive: '',
  uniqueSellingPointsDetailed: [''],
  faqs: [{ question: '', answer: '' }],
  guarantee: '',
  certificateInfo: '',
  links: [''],
  testimonials: [''],
  registrationLink: '',
  refundPolicy: '',
  pdfOriginalName: undefined,
});

const singularizeLabel = (label: string): string => {
  if (label.toLowerCase().endsWith('ies')) return label.substring(0, label.length - 3) + 'y';
  if (label.toLowerCase().endsWith('s')) return label.substring(0, label.length - 1);
  return label;
};

const WorkshopManagementModal: React.FC<WorkshopManagementModalProps> = ({ isOpen, onClose, onWorkshopsUpdated, isGeminiConfigured }) => {
  const [products, setProducts] = useState<WorkshopDetailedDoc[]>([]); // Renamed from workshops
  const [currentProduct, setCurrentProduct] = useState<Omit<WorkshopDetailedDoc, 'pdfStoragePath' | 'pdfDownloadURL' | 'createdAt' | 'updatedAt'>>(initialProductFormData());
  const [editingProductId, setEditingProductId] = useState<string | null>(null); // Changed to string ID
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [existingPdfStoragePath, setExistingPdfStoragePath] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [isPdfAnalyzing, setIsPdfAnalyzing] = useState(false); // For PDF auto-fill loading
  const [error, setError] = useState<string | null>(null);
  const [pdfAnalysisError, setPdfAnalysisError] = useState<string | null>(null);

  // FIX: Define ProductFormDataType for currentProduct's type
  type ProductFormDataType = typeof currentProduct;

  // FIX: Define StringArrayKeys to specifically type keys for string array fields
  type StringArrayKeys = {
    [K in keyof ProductFormDataType]: ProductFormDataType[K] extends string[] ? K : never;
  }[keyof ProductFormDataType];


  const fetchProducts = useCallback(async () => { // Renamed
    setIsLoading(true);
    try {
      const allProducts = await dbService.getAllProducts(); // Changed
      setProducts(allProducts);
    } catch (e) {
      console.error("Error fetching products from Supabase:", e);
      setError("Could not load products from Supabase.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      // Reset local states when modal opens anew or for a new item
      if (!editingProductId) { 
        setCurrentProduct(initialProductFormData());
        setSelectedPdfFile(null);
        setExistingPdfStoragePath(undefined);
        setPdfAnalysisError(null);
      }
    }
  }, [isOpen, fetchProducts, editingProductId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ ...prev, [name]: value }));
  };
  
  const handleProductCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentProduct(prev => ({ ...prev, productCategory: e.target.value as ProductCategory }));
  };

  // FIX: Use StringArrayKeys for the 'field' parameter
  const handleArrayFieldChange = (field: StringArrayKeys, index: number, value: string) => {
    setCurrentProduct(prev => {
      const newArray = [...(prev[field] || [])]; // prev[field] is now correctly typed as string[]
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  // FIX: Use StringArrayKeys for the 'field' parameter
  const addArrayFieldItem = (field: StringArrayKeys) => {
    setCurrentProduct(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));
  };

  // FIX: Use StringArrayKeys for the 'field' parameter
  const removeArrayFieldItem = (field: StringArrayKeys, index: number) => {
    setCurrentProduct(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
  };

  const handleModuleChange = (index: number, field: keyof WorkshopModule, value: string) => {
    setCurrentProduct(prev => {
      const newModules = [...(prev.modules || [])];
      const currentModule = newModules[index] || { title: '', content: ''};
      if (field === 'keywords') {
        // This specific handler assumes keywords are not directly edited via this simple string input.
        // If they were, value would need to be processed (e.g. split by comma) or input changed.
        // For now, to prevent type errors if this path was taken, we can ignore or handle specific field:
        console.warn("Keyword editing via simple string input in handleModuleChange is not fully supported yet.");
        newModules[index] = { ...currentModule }; // No change for keywords from simple string
      } else {
        newModules[index] = { ...currentModule, [field]: value };
      }
      return { ...prev, modules: newModules };
    });
  };
  const addModule = () => setCurrentProduct(prev => ({ ...prev, modules: [...(prev.modules || []), { title: '', content: '' }] }));
  const removeModule = (index: number) => setCurrentProduct(prev => ({ ...prev, modules: (prev.modules || []).filter((_, i) => i !== index) }));

  const handleFaqChange = (index: number, field: keyof WorkshopFAQ, value: string) => {
    setCurrentProduct(prev => {
      const newFaqs = [...(prev.faqs || [])];
      newFaqs[index] = { ...(newFaqs[index] || {question: '', answer: ''}), [field]: value };
      return { ...prev, faqs: newFaqs };
    });
  };
  const addFaq = () => setCurrentProduct(prev => ({ ...prev, faqs: [...(prev.faqs || []), { question: '', answer: '' }] }));
  const removeFaq = (index: number) => setCurrentProduct(prev => ({ ...prev, faqs: (prev.faqs || []).filter((_, i) => i !== index) }));
  
  const handleSessionChange = (index: number, field: keyof SessionInfo, value: string | string[]) => {
    setCurrentProduct(prev => {
      const newSessions = [...(prev.sessions || [])];
      newSessions[index] = { ...(newSessions[index] || {session: '', description: ['']}), [field]: value } as SessionInfo;
      return { ...prev, sessions: newSessions };
    });
  };
  const addSession = () => setCurrentProduct(prev => ({ ...prev, sessions: [...(prev.sessions || []), { session: '', time: '', day: '', description: [''] }] }));
  const removeSession = (index: number) => setCurrentProduct(prev => ({ ...prev, sessions: (prev.sessions || []).filter((_, i) => i !== index) }));
  
  const handleSessionDescriptionChange = (sessionIndex: number, descIndex: number, value: string) => {
     setCurrentProduct(prev => {
        const newSessions = JSON.parse(JSON.stringify(prev.sessions || [])) as SessionInfo[]; 
        if (newSessions[sessionIndex]) {
            let currentDescription = newSessions[sessionIndex].description;
            if (Array.isArray(currentDescription)) {
                currentDescription[descIndex] = value;
            } else { 
                // If it was a single string or undefined, convert/set to array
                const newDescArray = ['']; // Start with a clean array if unsure
                newDescArray[descIndex] = value;
                newSessions[sessionIndex].description = newDescArray;
            }
        }
        return { ...prev, sessions: newSessions };
    });
  };
  const addSessionDescription = (sessionIndex: number) => {
    setCurrentProduct(prev => {
        const newSessions = JSON.parse(JSON.stringify(prev.sessions || [])) as SessionInfo[];
         if (newSessions[sessionIndex]) {
            let currentDescription = newSessions[sessionIndex].description;
            if (Array.isArray(currentDescription)) {
                currentDescription.push('');
            } else { 
                newSessions[sessionIndex].description = currentDescription ? [currentDescription, ''] : [''];
            }
        }
        return { ...prev, sessions: newSessions };
    });
  };
  const removeSessionDescription = (sessionIndex: number, descIndex: number) => {
    setCurrentProduct(prev => {
        const newSessions = JSON.parse(JSON.stringify(prev.sessions || [])) as SessionInfo[];
        if (newSessions[sessionIndex]) {
            let currentDescription = newSessions[sessionIndex].description;
            if (Array.isArray(currentDescription)) {
                currentDescription.splice(descIndex, 1);
            }
        }
        return { ...prev, sessions: newSessions };
    });
  };

  const mergeExtractedData = (extracted: ExtractedPdfProductData) => {
    setCurrentProduct(prev => {
      const updated = { ...prev };

      // Simple string fields
      if (extracted.title) updated.title = extracted.title;
      if (extracted.fullDescription) updated.fullDescription = extracted.fullDescription;
      if (extracted.price) updated.price = extracted.price;
      if (extracted.discountDeadline) updated.discountDeadline = extracted.discountDeadline;
      if (extracted.guarantee) updated.guarantee = extracted.guarantee;
      if (extracted.certificateInfo) updated.certificateInfo = extracted.certificateInfo;
      if (extracted.registrationLink) updated.registrationLink = extracted.registrationLink;
      if (extracted.refundPolicy) updated.refundPolicy = extracted.refundPolicy;
      if (extracted.targetAudienceDeepDive) updated.targetAudienceDeepDive = extracted.targetAudienceDeepDive;

      // Array of strings fields
      const arrayStringFields: StringArrayKeys[] = ['benefits', 'targetAudience', 'learningObjectives', 'mentors', 'uniqueSellingPointsDetailed', 'links', 'testimonials'];
      arrayStringFields.forEach(field => {
        if (extracted[field] && Array.isArray(extracted[field])) {
          const val = extracted[field] as string[]; 
          updated[field] = val.length > 0 ? val : [''];
        } else if (!prev[field] || (prev[field] as string[]).length === 0) {
          updated[field] = [''];
        }
      });
      
      // Complex array fields
      if (extracted.modules) {
        updated.modules = extracted.modules.length > 0 ? extracted.modules : [{ title: '', content: '' }];
      } else if (!prev.modules || prev.modules.length === 0) {
        updated.modules = [{ title: '', content: '' }];
      }

      if (extracted.faqs) {
        updated.faqs = extracted.faqs.length > 0 ? extracted.faqs : [{ question: '', answer: '' }];
      } else if (!prev.faqs || prev.faqs.length === 0) {
        updated.faqs = [{ question: '', answer: '' }];
      }
      
      if (extracted.sessions) {
        updated.sessions = extracted.sessions.length > 0 ? extracted.sessions.map(s => ({
            session: s.session || '',
            time: s.time || '',
            day: s.day || '',
            description: Array.isArray(s.description) ? s.description : (s.description ? [s.description] : [''])
        })) : [{ session: '', time: '', day: '', description: [''] }];
      } else if (!prev.sessions || prev.sessions.length === 0) {
         updated.sessions = [{ session: '', time: '', day: '', description: [''] }];
      }
      return updated;
    });
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPdfFile(file);
      setCurrentProduct(prev => ({ ...prev, pdfOriginalName: file.name }));
      setPdfAnalysisError(null);

      if (isGeminiConfigured && file.type === 'application/pdf') {
        setIsPdfAnalyzing(true);
        try {
          const extractedData = await analyzePdfForProductDetails(file);
          mergeExtractedData(extractedData);
        } catch (analysisErr) {
          console.error("Error analyzing PDF for auto-fill:", analysisErr);
          setPdfAnalysisError(`🤖 PDF analysis failed: ${analysisErr instanceof Error ? analysisErr.message : 'Unknown error'}. Please fill fields manually.`);
        } finally {
          setIsPdfAnalyzing(false);
        }
      } else if (file.type !== 'application/pdf') {
         setPdfAnalysisError("Invalid file type. Please upload a PDF for analysis.");
      } else if (!isGeminiConfigured) {
        setPdfAnalysisError("Gemini API not configured. Cannot auto-fill from PDF.");
      }
    }
  };


  const removePdfFile = () => {
    setSelectedPdfFile(null); 
    setCurrentProduct(prev => ({ ...prev, pdfOriginalName: undefined })); 
    setPdfAnalysisError(null);
    if (document.getElementById('pdfFile')) { // Reset file input
      (document.getElementById('pdfFile') as HTMLInputElement).value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPdfAnalysisError(null);
    setIsLoading(true);

    if (!currentProduct.title || !currentProduct.productCategory) {
      setError("Product Title and Product Type are required.");
      setIsLoading(false);
      return;
    }
    
    const productDataForDb: Omit<WorkshopDetailedDoc, 'pdfDownloadURL' | 'pdfStoragePath' | 'createdAt' | 'updatedAt'> = {
        ...currentProduct,
        id: editingProductId || currentProduct.id || uuidv4(), 
    };

    try {
      if (editingProductId) {
        await dbService.updateProduct(productDataForDb, selectedPdfFile, existingPdfStoragePath);
      } else {
        await dbService.addProduct(productDataForDb, selectedPdfFile);
      }
      onWorkshopsUpdated(); 
      fetchProducts(); 
      setEditingProductId(null);
      setCurrentProduct(initialProductFormData());
      setSelectedPdfFile(null);
      setExistingPdfStoragePath(undefined);
    } catch (err) {
      console.error("Error saving product to Supabase:", err);
      setError(`Failed to save product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: WorkshopDetailedDoc) => {
    setEditingProductId(product.id); 
    const { pdfStoragePath, pdfDownloadURL, createdAt, updatedAt, ...formData } = product; 
    setCurrentProduct(formData);
    setSelectedPdfFile(null); 
    setExistingPdfStoragePath(pdfStoragePath); 
    setError(null);
    setPdfAnalysisError(null);
  };

  const handleDelete = async (id: string) => { 
    if (window.confirm("Are you sure you want to delete this product and its associated PDF from Supabase? This cannot be undone.")) {
      setError(null);
      setPdfAnalysisError(null);
      setIsLoading(true);
      try {
        await dbService.deleteProduct(id); 
        onWorkshopsUpdated();
        fetchProducts();
        if (editingProductId === id) {
          setEditingProductId(null);
          setCurrentProduct(initialProductFormData());
          setSelectedPdfFile(null);
          setExistingPdfStoragePath(undefined);
        }
      } catch (err) {
        console.error("Error deleting product from Supabase:", err);
        setError("Failed to delete product.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setCurrentProduct(initialProductFormData());
    setSelectedPdfFile(null);
    setExistingPdfStoragePath(undefined);
    setError(null);
    setPdfAnalysisError(null);
  };

  if (!isOpen) return null;

  // FIX: Use StringArrayKeys for the 'fieldName' parameter
  const renderArrayField = (label: string, fieldName: StringArrayKeys, placeholder: string = "Enter value") => (
    <div>
      <label className="block text-sm font-medium text-[var(--gs-off-white)]">{label}</label>
      {(currentProduct[fieldName] || ['']).map((item, index) => (
        <div key={index} className="flex items-center space-x-2 mt-1">
          <input
            type="text"
            value={item}
            onChange={(e) => handleArrayFieldChange(fieldName, index, e.target.value)}
            className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]"
            placeholder={placeholder}
            disabled={isPdfAnalyzing}
          />
          <button type="button" onClick={() => removeArrayFieldItem(fieldName, index)} className="text-[var(--gs-lava)] p-1 rounded hover:bg-[var(--gs-lava-darker)] hover:text-white" disabled={isPdfAnalyzing}>✕</button>
        </div>
      ))}
      <button type="button" onClick={() => addArrayFieldItem(fieldName)} className="mt-1 text-xs text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>+ Add {singularizeLabel(label) || 'Item'}</button>
    </div>
  );
  

  return (
    <div className="fixed inset-0 bg-[var(--gs-black-pearl)] bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-[var(--gs-dark-grey-6)] p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-[var(--gs-mint)]">{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 text-[var(--gs-slate)] hover:text-[var(--gs-off-white)] rounded-full">&times;</button>
        </div>

        {error && <div className="mb-4 p-3 bg-[var(--gs-lava)] text-white rounded-md text-sm">{error}</div>}
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {editingProductId && (
                <div>
                    <label className="block text-sm font-medium text-[var(--gs-off-white)]">Product ID</label>
                    <input type="text" value={editingProductId} readOnly disabled className="mt-1 w-full p-2 bg-[var(--gs-dark-grey-4)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-slate)] opacity-70"/>
                </div>
            )}

            <div>
              <label htmlFor="productCategory" className="block text-sm font-medium text-[var(--gs-off-white)]">Product Type <span className="text-red-500">*</span></label>
              <select
                  name="productCategory"
                  id="productCategory"
                  value={currentProduct.productCategory}
                  onChange={handleProductCategoryChange}
                  required
                  className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]"
                  disabled={isPdfAnalyzing}
              >
                  {PRODUCT_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--gs-off-white)]">Product Name (Title) <span className="text-red-500">*</span></label>
              <input type="text" name="title" id="title" value={currentProduct.title} onChange={handleInputChange} required className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing} />
            </div>
            
            <div>
              <label htmlFor="fullDescription" className="block text-sm font-medium text-[var(--gs-off-white)]">Full Description</label>
              <textarea name="fullDescription" id="fullDescription" value={currentProduct.fullDescription || ''} onChange={handleInputChange} rows={4} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)] resize-y" disabled={isPdfAnalyzing} />
            </div>

            {/* PDF Upload */}
            <div>
              <label htmlFor="pdfFile" className="block text-sm font-medium text-[var(--gs-off-white)]">Associated PDF Document</label>
              <input type="file" id="pdfFile" name="pdfFile" accept=".pdf" onChange={handlePdfFileChange} className="mt-1 w-full text-sm text-[var(--gs-slate)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--gs-mint)] file:text-[var(--gs-tide-white)] hover:file:bg-[var(--gs-mint-darker)]" disabled={isPdfAnalyzing || !isGeminiConfigured && !editingProductId /* Disable if adding new and Gemini not configured for auto-fill */}/>
              {currentProduct.pdfOriginalName && (
                <div className="mt-2 text-xs text-[var(--gs-off-white)] bg-[var(--gs-dark-grey-4)] p-2 rounded flex justify-between items-center">
                  <span>
                    Current PDF: {currentProduct.pdfOriginalName}
                    { editingProductId && products.find(p=>p.id === editingProductId)?.pdfDownloadURL && 
                       <a href={products.find(p=>p.id === editingProductId)?.pdfDownloadURL} target="_blank" rel="noopener noreferrer" className="text-[var(--gs-mint)] hover:underline ml-2">(View)</a>
                    }
                  </span>
                  <button type="button" onClick={removePdfFile} className="ml-2 text-[var(--gs-lava)] hover:text-[var(--gs-lava-darker)]" disabled={isPdfAnalyzing}>Remove</button>
                </div>
              )}
              {!currentProduct.pdfOriginalName && editingProductId && products.find(p=>p.id === editingProductId)?.pdfOriginalName && (
                 <div className="mt-2 text-xs text-[var(--gs-slate)] bg-[var(--gs-dark-grey-4)] p-2 rounded">
                    Previously: {products.find(p=>p.id === editingProductId)?.pdfOriginalName} (will be removed on save unless a new PDF is uploaded)
                 </div>
              )}
               <p className="mt-1 text-xs text-[var(--gs-slate)]">
                 {isGeminiConfigured ? "Uploading a PDF will attempt to auto-fill fields below. Ensure text fields accurately reflect PDF content for AI." : "PDF content can be summarized in the fields below for AI use."}
               </p>
               {isPdfAnalyzing && <p className="mt-1 text-sm text-[var(--gs-mint)] animate-pulse">🤖 Analyzing PDF to auto-fill fields...</p>}
               {pdfAnalysisError && <p className="mt-1 text-sm text-[var(--gs-lava)]">{pdfAnalysisError}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-[var(--gs-off-white)]">Price</label>
                    <input type="text" name="price" id="price" value={currentProduct.price || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                <div>
                    <label htmlFor="discountDeadline" className="block text-sm font-medium text-[var(--gs-off-white)]">Discount Deadline</label>
                    <input type="text" name="discountDeadline" id="discountDeadline" value={currentProduct.discountDeadline || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                 <div>
                    <label htmlFor="guarantee" className="block text-sm font-medium text-[var(--gs-off-white)]">Guarantee</label>
                    <input type="text" name="guarantee" id="guarantee" value={currentProduct.guarantee || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                 <div>
                    <label htmlFor="certificateInfo" className="block text-sm font-medium text-[var(--gs-off-white)]">Certificate Info</label>
                    <input type="text" name="certificateInfo" id="certificateInfo" value={currentProduct.certificateInfo || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                 <div>
                    <label htmlFor="registrationLink" className="block text-sm font-medium text-[var(--gs-off-white)]">Registration Link</label>
                    <input type="url" name="registrationLink" id="registrationLink" value={currentProduct.registrationLink || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                 <div>
                    <label htmlFor="refundPolicy" className="block text-sm font-medium text-[var(--gs-off-white)]">Refund Policy</label>
                    <input type="text" name="refundPolicy" id="refundPolicy" value={currentProduct.refundPolicy || ''} onChange={handleInputChange} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                </div>
                 <div>
                    <label htmlFor="targetAudienceDeepDive" className="block text-sm font-medium text-[var(--gs-off-white)]">Target Audience Deep Dive</label>
                    <textarea name="targetAudienceDeepDive" id="targetAudienceDeepDive" value={currentProduct.targetAudienceDeepDive || ''} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)] resize-y" disabled={isPdfAnalyzing}/>
                </div>
            </div>

            {renderArrayField('Benefits', 'benefits', "Enter a benefit")}
            {renderArrayField('Target Audience Segments', 'targetAudience', "Enter a target audience segment")}
            {renderArrayField('Learning Objectives', 'learningObjectives', "Enter a learning objective")}
            {renderArrayField('Mentors', 'mentors', "Enter mentor name/title")}
            {renderArrayField('Unique Selling Points (Detailed)', 'uniqueSellingPointsDetailed', "Enter a detailed USP")}
            {renderArrayField('Relevant Links', 'links', "Enter a URL")}
            {renderArrayField('Testimonials', 'testimonials', "Enter a testimonial")}

            <fieldset className="border border-[var(--gs-slate)] p-3 rounded-md">
                <legend className="text-sm font-medium text-[var(--gs-mint)] px-1">Modules</legend>
                {(currentProduct.modules || [{ title: '', content: '' }]).map((module, index) => (
                <div key={index} className="space-y-2 border-b border-[var(--gs-dark-grey-4)] py-2 mb-2 last:border-b-0">
                    <input type="text" placeholder="Module Title" value={module.title} onChange={(e) => handleModuleChange(index, 'title', e.target.value)} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                    <textarea placeholder="Module Content" value={module.content} onChange={(e) => handleModuleChange(index, 'content', e.target.value)} rows={3} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)] resize-y" disabled={isPdfAnalyzing}/>
                    <button type="button" onClick={() => removeModule(index)} className="text-xs text-[var(--gs-lava)] hover:underline" disabled={isPdfAnalyzing}>Remove Module</button>
                </div>
                ))}
                <button type="button" onClick={addModule} className="mt-1 text-xs text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>+ Add Module</button>
            </fieldset>

            <fieldset className="border border-[var(--gs-slate)] p-3 rounded-md">
                <legend className="text-sm font-medium text-[var(--gs-mint)] px-1">Sessions</legend>
                {(currentProduct.sessions || [{ session: '', time: '', day: '', description: [''] }]).map((sessionItem, sIndex) => (
                <div key={sIndex} className="space-y-2 border-b border-[var(--gs-dark-grey-4)] py-2 mb-2 last:border-b-0">
                    <input type="text" placeholder="Session Title" value={sessionItem.session} onChange={(e) => handleSessionChange(sIndex, 'session', e.target.value)} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Time (e.g., 10 AM - 12 PM)" value={sessionItem.time || ''} onChange={(e) => handleSessionChange(sIndex, 'time', e.target.value)} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                        <input type="text" placeholder="Day (e.g., Day 1)" value={sessionItem.day || ''} onChange={(e) => handleSessionChange(sIndex, 'day', e.target.value)} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                    </div>
                    <label className="text-xs text-[var(--gs-off-white)]">Description Points:</label>
                    {(Array.isArray(sessionItem.description) ? sessionItem.description : (sessionItem.description ? [sessionItem.description] : [''])).map((desc, dIndex) => (
                         <div key={dIndex} className="flex items-center space-x-2">
                            <input type="text" placeholder="Description point" value={desc} onChange={(e) => handleSessionDescriptionChange(sIndex, dIndex, e.target.value)} className="w-full p-1 text-sm bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                            <button type="button" onClick={() => removeSessionDescription(sIndex, dIndex)} className="text-[var(--gs-lava)] p-0.5 rounded hover:bg-[var(--gs-lava-darker)] hover:text-white text-xs" disabled={isPdfAnalyzing}>✕</button>
                         </div>
                    ))}
                    <button type="button" onClick={() => addSessionDescription(sIndex)} className="text-xs text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>+ Add Description Point</button>
                    <button type="button" onClick={() => removeSession(sIndex)} className="text-xs text-[var(--gs-lava)] hover:underline ml-2" disabled={isPdfAnalyzing}>Remove Session</button>
                </div>
                ))}
                <button type="button" onClick={addSession} className="mt-1 text-xs text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>+ Add Session</button>
            </fieldset>

            <fieldset className="border border-[var(--gs-slate)] p-3 rounded-md">
                <legend className="text-sm font-medium text-[var(--gs-mint)] px-1">FAQs</legend>
                {(currentProduct.faqs || [{ question: '', answer: '' }]).map((faq, index) => (
                <div key={index} className="space-y-2 border-b border-[var(--gs-dark-grey-4)] py-2 mb-2 last:border-b-0">
                    <input type="text" placeholder="FAQ Question" value={faq.question} onChange={(e) => handleFaqChange(index, 'question', e.target.value)} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)]" disabled={isPdfAnalyzing}/>
                    <textarea placeholder="FAQ Answer" value={faq.answer} onChange={(e) => handleFaqChange(index, 'answer', e.target.value)} rows={2} className="w-full p-2 bg-[var(--gs-bottle-green)] border border-[var(--gs-slate)] rounded-md text-[var(--gs-off-white)] resize-y" disabled={isPdfAnalyzing}/>
                    <button type="button" onClick={() => removeFaq(index)} className="text-xs text-[var(--gs-lava)] hover:underline" disabled={isPdfAnalyzing}>Remove FAQ</button>
                </div>
                ))}
                <button type="button" onClick={addFaq} className="mt-1 text-xs text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>+ Add FAQ</button>
            </fieldset>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-[var(--gs-slate)] text-[var(--gs-tide-white)] rounded-lg hover:bg-[var(--gs-dark-grey-4)] transition-colors" disabled={isLoading || isPdfAnalyzing}>Cancel</button>
              <button type="submit" disabled={isLoading || isPdfAnalyzing} className="px-4 py-2 bg-[var(--gs-mint)] text-[var(--gs-tide-white)] rounded-lg hover:bg-[var(--gs-mint-darker)] transition-colors disabled:opacity-50">
                {isLoading ? 'Saving...' : (editingProductId ? 'Save Changes' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>

        <hr className="my-6 border-[var(--gs-slate)]"/>

        <div className="flex-shrink-0">
          <h3 className="text-xl font-semibold text-[var(--gs-mint)] mb-3">Existing Products</h3>
          {isLoading && products.length === 0 && <p className="text-[var(--gs-slate)]">Loading products from Supabase...</p>}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {products.length === 0 && !isLoading && <p className="text-[var(--gs-slate)]">No products found in Supabase.</p>}
            {products.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-[var(--gs-bottle-green-lighter)] rounded-md">
                <span className="text-[var(--gs-off-white)]">
                  {p.title} ({p.productCategory}) 
                  {p.pdfOriginalName && p.pdfDownloadURL &&
                    <a href={p.pdfDownloadURL} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--gs-mint)] ml-1 hover:underline">(PDF: {p.pdfOriginalName})</a>
                  }
                </span>
                <div className="space-x-2">
                  <button onClick={() => handleEdit(p)} className="text-sm text-[var(--gs-mint)] hover:underline" disabled={isPdfAnalyzing}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-sm text-[var(--gs-lava)] hover:underline" disabled={isPdfAnalyzing || isLoading}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopManagementModal;
