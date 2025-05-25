

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { 
    VideoAnalysisResults, RewrittenScriptVariation, WorkshopDetails, 
    ProductOption, ScriptMode, AppMode, ImageSize, GeneratedStaticAd, WorkshopDetailedDoc, ImageSizeOption,
    ProductCategory, WorkshopType // Added ProductCategory
} from './types';
import { 
    INITIAL_REFERENCE_MODE_SYSTEM_PROMPT, INITIAL_FRESH_SCRIPT_SYSTEM_PROMPT, 
    IMAGE_SIZE_OPTIONS, STATIC_AD_FRESH_PROMPT_SYSTEM_INSTRUCTION, STATIC_AD_REFERENCE_PROMPT_SYSTEM_INSTRUCTION
    // WORKSHOP_OPTIONS removed, LEGACY_WORKSHOP_OPTIONS_FOR_SEEDING will be used internally by apiService
} from './constants';
import { 
    analyzeVideoAndScript, rewriteScriptForReference, generateFreshScripts,
    generateImagePrompt, generateStaticAdImage
} from './services/geminiService'; 
import { dbService } from './services/dbService'; 
import { isSupabaseConfigured } from './supabaseConfig'; 
import { getDefaultWorkshopDetailedDocForSeeding } from './services/apiService'; // Adjusted import for clarity

import VideoUpload from './components/VideoUpload';
import ImageUpload from './components/ImageUpload';
import WorkshopSelector from './components/WorkshopSelector';
import ImageSizeSelector from './components/ImageSizeSelector';
import CalloutsInput from './components/CalloutsInput';
import ScriptOutputDisplay from './components/ScriptOutputDisplay';
import StaticAdOutputDisplay from './components/StaticAdOutputDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import AlertMessage from './components/AlertMessage';
import SettingsPanel from './components/SettingsPanel';
import SettingsIcon from './components/icons/SettingsIcon';
import WorkshopManagementModal from './components/WorkshopManagementModal'; 

const LOCAL_STORAGE_OPENAI_KEY = 'userOpenAiApiKey';

const App: React.FC = () => {
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [userOpenAiApiKey, setUserOpenAiApiKey] = useState<string | null>(null);
  
  const [appMode, setAppMode] = useState<AppMode>('video');
  const [scriptingMode, setScriptingMode] = useState<ScriptMode>('reference');

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoAnalysisResults, setVideoAnalysisResults] = useState<VideoAnalysisResults | null>(null);
  const [rewrittenScripts, setRewrittenScripts] = useState<RewrittenScriptVariation[]>([]);

  const [staticAdFile, setStaticAdFile] = useState<File | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<ImageSize | null>(IMAGE_SIZE_OPTIONS[0].value);
  const [generatedStaticAds, setGeneratedStaticAds] = useState<GeneratedStaticAd[]>([]);
  const [referenceImageAnalysisText, setReferenceImageAnalysisText] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null); // Changed from selectedWorkshop
  const [userCallouts, setUserCallouts] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isWorkshopManagementModalOpen, setIsWorkshopManagementModalOpen] = useState<boolean>(false);

  const [referenceSystemPrompt, setReferenceSystemPrompt] = useState<string>(INITIAL_REFERENCE_MODE_SYSTEM_PROMPT);
  const [freshSystemPrompt, setFreshSystemPrompt] = useState<string>(INITIAL_FRESH_SCRIPT_SYSTEM_PROMPT);
  const [staticAdReferenceSystemPrompt, setStaticAdReferenceSystemPrompt] = useState<string>(STATIC_AD_REFERENCE_PROMPT_SYSTEM_INSTRUCTION);
  const [staticAdFreshSystemPrompt, setStaticAdFreshSystemPrompt] = useState<string>(STATIC_AD_FRESH_PROMPT_SYSTEM_INSTRUCTION);
  
  const [allProductsMap, setAllProductsMap] = useState<Partial<Record<string, WorkshopDetailedDoc>>>({}); // Changed from allWorkshopsMap
  const [isProductDataLoading, setIsProductDataLoading] = useState<boolean>(true); // Changed from isWorkshopDataLoading
  const [supabaseReady, setSupabaseReady] = useState<boolean>(false);


  const loadProductsFromDbOrDefaults = useCallback(async () => { // Renamed function
    if (!supabaseReady) {
      if (!isSupabaseConfigured) {
         setError("Supabase is not configured. Product data cannot be loaded. Please update supabaseConfig.ts");
      } else {
        setError("Supabase is initializing or connection failed. Product data might be unavailable.");
      }
      setIsProductDataLoading(false);
      return;
    }

    setIsProductDataLoading(true);
    if (error && !error.startsWith("API Key Issues:") && !error.toLowerCase().includes("supabase")) {
        setError(null);
    }
    
    try {
      let productsFromDb = await dbService.getAllProducts();
      if (productsFromDb.length === 0) {
        console.log("Supabase product database is empty. Populating with default workshops from JSON...");
        
        // Iterate over WorkshopType enum values to get default workshop content
        for (const workshopTypeKey of Object.keys(WorkshopType) as Array<keyof typeof WorkshopType>) {
            const workshopTypeValue = WorkshopType[workshopTypeKey]; // e.g., "Marketing Mastermind"
            const defaultDocContent = await getDefaultWorkshopDetailedDocForSeeding(workshopTypeValue);

            if (defaultDocContent) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // FIX: Removed 'id: oldIdFromFile' from destructuring as 'defaultDocContent' type Omit<WorkshopDetailedDoc, "id" | "productCategory"> does not contain 'id'.
                const { createdAt, updatedAt, pdfDownloadURL, pdfStoragePath, pdfOriginalName, ...contentFields } = defaultDocContent;
                
                const newProductDoc: Omit<WorkshopDetailedDoc, 'pdfDownloadURL' | 'pdfStoragePath' | 'pdfOriginalName' | 'createdAt' | 'updatedAt'> = {
                    ...contentFields, // contains title, fullDescription, benefits, etc.
                    id: uuidv4(), // Assign a new UUID
                    productCategory: ProductCategory.WORKSHOP, // All defaults are workshops
                    // Ensure all necessary fields are present
                    benefits: contentFields.benefits || [],
                    targetAudience: contentFields.targetAudience || [],
                    sessions: contentFields.sessions || [],
                    modules: contentFields.modules || [],
                    learningObjectives: contentFields.learningObjectives || [],
                    faqs: contentFields.faqs || [],
                };
                await dbService.addProduct(newProductDoc, null); // Add to Supabase with null PDF
            }
        }
        productsFromDb = await dbService.getAllProducts(); 
        console.log("Default products (as workshops) populated into Supabase.");
      }
      
      const productsMap: Partial<Record<string, WorkshopDetailedDoc>> = {};
      productsFromDb.forEach(p => {
        if (p.id) { 
            productsMap[p.id] = p;
        }
      });
      setAllProductsMap(productsMap);

    } catch (err) {
      console.error("Failed to load product data from Supabase:", err);
      setError(`Could not load product information from Supabase. ${err instanceof Error ? err.message : 'Check console.'}`);
    } finally {
      setIsProductDataLoading(false);
    }
  }, [supabaseReady, error]); 

  useEffect(() => {
    if (isSupabaseConfigured) {
        dbService.initDB()
            .then(() => {
                setSupabaseReady(true);
                if (error && (error.includes("Supabase is initializing") || error.includes("Supabase initialization failed"))) {
                    setError(null); 
                }
            })
            .catch(initError => {
                console.error("Error during dbService.initDB (Supabase) in App.tsx:", initError);
                setError(`Supabase initialization failed: ${initError instanceof Error ? initError.message : "Unknown error"}. Product data may be unavailable.`);
                setSupabaseReady(false);
                setIsProductDataLoading(false);
            });
    } else {
        setError("Supabase is not configured. Please update supabaseConfig.ts. Product features will be unavailable.");
        setSupabaseReady(false);
        setIsProductDataLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseConfigured]); 

  useEffect(() => {
    if (supabaseReady) {
      loadProductsFromDbOrDefaults();
    }
  }, [supabaseReady, loadProductsFromDbOrDefaults]);


  useEffect(() => {
    const gemKey = process.env.API_KEY;
    if (!gemKey) console.warn("Gemini API Key (API_KEY) not configured via environment variable.");
    setGeminiApiKey(gemKey || null);

    const storedOpenAiKey = localStorage.getItem(LOCAL_STORAGE_OPENAI_KEY);
    if (storedOpenAiKey) setUserOpenAiApiKey(storedOpenAiKey);
    else console.warn("OpenAI API Key not found in local storage. Please configure it in settings.");
    
  }, []);


   useEffect(() => {
    let apiKeyErrors: string[] = [];
    if (!geminiApiKey && !process.env.API_KEY) { 
        apiKeyErrors.push("Gemini API Key (API_KEY) for script/prompt features is missing (set API_KEY env var).");
    }
    if (!userOpenAiApiKey) {
        apiKeyErrors.push(`OpenAI API Key for static ad image generation is missing (configure in Settings).`);
    }

    const newErrorMsg = apiKeyErrors.length > 0 ? `API Key Issues: ${apiKeyErrors.join(' ')} Application features may be limited.` : null;
    
    if (newErrorMsg) {
        if (!error || !error.toLowerCase().includes("supabase")) {
            setError(newErrorMsg);
        }
    } else if (error && error.startsWith("API Key Issues:")) {
        setError(null); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geminiApiKey, userOpenAiApiKey, error]);


  const handleUserOpenAiApiKeyChange = (key: string) => {
    const trimmedKey = key.trim();
    setUserOpenAiApiKey(trimmedKey);
    if (trimmedKey) localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, trimmedKey);
    else localStorage.removeItem(LOCAL_STORAGE_OPENAI_KEY);
    if (trimmedKey && error && error.includes("OpenAI API Key")) setError(null);
  };

  const resetCommonInputs = () => {
    setSelectedProductId(null); // Changed
    setUserCallouts('');
    if (error && !error.startsWith("API Key Issues:") && !error?.toLowerCase().includes("supabase")) setError(null);
    setCurrentStage('');
  };

  const resetVideoModeOutputs = () => { setVideoAnalysisResults(null); setRewrittenScripts([]); };
  const resetStaticModeOutputs = () => { setGeneratedStaticAds([]); setReferenceImageAnalysisText(null); };

  const handleAppModeChange = (mode: AppMode) => {
    setAppMode(mode); setVideoFile(null); setStaticAdFile(null);
    resetCommonInputs(); resetVideoModeOutputs(); resetStaticModeOutputs();
  };
  
  const handleScriptingModeChange = (mode: ScriptMode) => {
    setScriptingMode(mode);
    if (mode === 'fresh') { setVideoFile(null); setStaticAdFile(null); }
    resetCommonInputs(); resetVideoModeOutputs(); resetStaticModeOutputs();
  };

  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file); resetVideoModeOutputs();
    if (error && !error.startsWith("API Key Issues:") && !error?.toLowerCase().includes("supabase")) setError(null);
    if (!file && scriptingMode === 'reference') resetCommonInputs();
  };
  
  const handleStaticAdFileChange = (file: File | null) => {
    setStaticAdFile(file); resetStaticModeOutputs();
    if (error && !error.startsWith("API Key Issues:") && !error?.toLowerCase().includes("supabase")) setError(null);
    if (!file && scriptingMode === 'reference') resetCommonInputs();
  };

  const handleProductChange = (value: string) => { // Renamed from handleWorkshopChange
    setSelectedProductId(value); // Changed
    resetVideoModeOutputs(); resetStaticModeOutputs();
    if (error && !error.startsWith("API Key Issues:") && !error?.toLowerCase().includes("supabase")) setError(null);
  };
  
  const handleImageSizeChange = (value: ImageSize) => { setSelectedImageSize(value); resetStaticModeOutputs(); };
  const handleCalloutsChange = (text: string) => { setUserCallouts(text); };


  const handleGenerate = useCallback(async () => {
    if (!selectedProductId) { setError("Please select a product (Workshop/IP)."); return; } // Changed
    if (appMode === 'video' && !geminiApiKey) { setError("Gemini API Key (API_KEY) is not configured for video scripts."); return; }
    if (appMode === 'static' && !userOpenAiApiKey) { setError(`OpenAI API Key is not configured for static ads. Configure in Settings.`); return; }
    if (appMode === 'static' && !geminiApiKey) { setError("Gemini API Key (API_KEY) is not configured for generating image prompts."); return; }
    if (appMode === 'static' && !selectedImageSize) { setError("Please select an image size for the static ad."); return; }

    setIsLoading(true);
    if (error && !error.startsWith("API Key Issues:") && !error?.toLowerCase().includes("supabase")) setError(null); 
    resetVideoModeOutputs(); resetStaticModeOutputs();
    
    const productFullDoc = selectedProductId ? allProductsMap[selectedProductId] : undefined; // Changed
    if (!productFullDoc) {
      setError(`Product details for selected item not found. Data might be loading or missing from Supabase.`); // Changed
      setIsLoading(false);
      return;
    }
    const productSummaryDetails: WorkshopDetails = productFullDoc; // WorkshopDetails is now generic for product summary

    try {
      const geminiAi = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
      if (!geminiAi) { 
          setError("Gemini API instance could not be initialized. Check API_KEY."); 
          setIsLoading(false); 
          return;
      }

      setCurrentStage('Processing request...');

      if (appMode === 'video') {
        if (scriptingMode === 'reference') {
          if (!videoFile) { setError("Please upload an ad video for Reference Mode."); setIsLoading(false); return; }
          setCurrentStage('Analyzing ad video visuals and transcribing audio (Gemini)...');
          const analysisResults = await analyzeVideoAndScript(geminiAi, videoFile);
          setVideoAnalysisResults(analysisResults);

          setCurrentStage('Adapting script for product context (Gemini)...'); // Changed
          const adaptedScript = await rewriteScriptForReference(
            geminiAi,
            {
              originalTranscription: analysisResults.transcription,
              visualSummary: analysisResults.visualSummary,
              originalScriptAnalysis: analysisResults.originalScriptAnalysis,
              workshopDetails: productSummaryDetails, // Changed
              detailedDocumentation: productFullDoc, // Changed
              userCallouts: userCallouts || undefined,
            },
            referenceSystemPrompt
          );
          setRewrittenScripts(adaptedScript ? [adaptedScript] : []); 
        } else { 
          setCurrentStage('Generating fresh video scripts for product (Gemini)...'); // Changed
          const freshGeneratedScripts = await generateFreshScripts(
            geminiAi,
            { 
              workshopDetails: productSummaryDetails, // Changed
              detailedDocumentation: productFullDoc, // Changed
              userCallouts: userCallouts || undefined,
            },
            freshSystemPrompt
          );
          setRewrittenScripts(freshGeneratedScripts); 
        }
      } else { 
          if (!selectedImageSize) { setError("Please select an image size."); setIsLoading(false); return; }
          if (!userOpenAiApiKey) { setError(`OpenAI API Key not configured. Please enter it in Settings.`); setIsLoading(false); return; }
          
          if (scriptingMode === 'reference' && !staticAdFile) { setError("Please upload a reference image for Static Ad Reference Mode."); setIsLoading(false); return; }
          
          setCurrentStage(scriptingMode === 'reference' ? 'Analyzing reference image and generating image prompt (Gemini)...' : 'Generating image prompt for fresh ad (Gemini)...');
          
          const promptResult = await generateImagePrompt(geminiAi, {
            workshopDetails: productSummaryDetails, // Changed
            detailedDocumentation: productFullDoc, // Changed
            userCallouts: userCallouts || undefined,
            imageSize: selectedImageSize,
            referenceImageFile: scriptingMode === 'reference' ? staticAdFile! : undefined,
          }, scriptingMode === 'reference' ? staticAdReferenceSystemPrompt : staticAdFreshSystemPrompt);


          if (promptResult.referenceImageAnalysis) setReferenceImageAnalysisText(promptResult.referenceImageAnalysis);
          
          setCurrentStage('Generating static ad image (OpenAI)...');
          const images = await generateStaticAdImage(promptResult.generatedImagePrompt, userOpenAiApiKey);
          
          setGeneratedStaticAds(images.map(img => ({
              id: uuidv4(),
              imageUrl: img.imageUrl,
              promptUsed: promptResult.generatedImagePrompt,
              referenceAnalysis: scriptingMode === 'reference' ? promptResult.referenceImageAnalysis : undefined
          })));
      }

    } catch (err) {
      console.error("Error during generation process:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred. Check console for details.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setCurrentStage('');
    }
  }, [
      appMode, scriptingMode, videoFile, staticAdFile, selectedProductId, userCallouts, selectedImageSize, // Changed selectedWorkshop
      geminiApiKey, userOpenAiApiKey, allProductsMap, // Changed allWorkshopsMap
      referenceSystemPrompt, freshSystemPrompt, staticAdReferenceSystemPrompt, staticAdFreshSystemPrompt, error 
    ]);
  
  const productOptionsForSelector: ProductOption[] = Object.values(allProductsMap) // Changed
    .filter(pDoc => !!pDoc && pDoc.id && pDoc.title) 
    .map(pDoc => ({
        value: pDoc!.id, // Use string ID
        label: pDoc!.title || pDoc!.id, 
    }))
    .sort((a,b) => a.label.localeCompare(b.label)); 
  
  const isGeminiApiKeyMissing = !geminiApiKey;
  const isUserOpenAiApiKeyMissing = !userOpenAiApiKey;

  let globalError = "";
  if (!isSupabaseConfigured) {
    globalError = "Critical: Supabase is not configured. Please update supabaseConfig.ts. Application cannot function correctly.";
  } else if (!supabaseReady && isSupabaseConfigured) {
    // Message for brief init period handled by loading spinner below
  } else if (isGeminiApiKeyMissing && isUserOpenAiApiKeyMissing) {
    globalError = `Critical: Gemini API Key (API_KEY env var) and OpenAI API Key (Settings) are not configured. Most features will not work.`;
  } else if (isGeminiApiKeyMissing) {
    globalError = `Warning: Gemini API Key (API_KEY env var) is not configured. Video ad and image prompt features will not work.`;
  } else if (isUserOpenAiApiKeyMissing) {
    globalError = `Warning: OpenAI API Key is not configured in Settings. Static ad image generation will not work.`;
  }


  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[var(--gs-bottle-green)] text-[var(--gs-off-white)] p-4 sm:p-8 flex flex-col items-center justify-center">
        <AlertMessage type="error" message={globalError} className="max-w-xl"/>
      </div>
    );
  }
  
  if (!supabaseReady && isSupabaseConfigured) { 
     return (
      <div className="min-h-screen bg-[var(--gs-bottle-green)] text-[var(--gs-off-white)] p-4 sm:p-8 flex flex-col items-center justify-center">
        <LoadingSpinner message="Initializing Supabase connection..." />
        {error && error.includes("Supabase initialization failed") && <AlertMessage type="error" message={error} className="mt-4 max-w-xl"/>}
      </div>
    );
  }

  if (isProductDataLoading && Object.keys(allProductsMap).length === 0 && supabaseReady) { // Changed
    return (
      <div className="min-h-screen bg-[var(--gs-bottle-green)] text-[var(--gs-off-white)] p-4 sm:p-8 flex flex-col items-center justify-center">
        <LoadingSpinner message="Loading product configurations from Supabase..." /> {/* Changed */}
        {error && <AlertMessage type="error" message={error} className="mt-4 max-w-xl"/>}
      </div>
    );
  }

  let uploadStep = 1, productSelectStep = 2, imageSizeStep = 0, calloutsStep = 3; // Renamed workshopStep
  if (appMode === 'static') {
    if (scriptingMode === 'reference') { uploadStep = 1; productSelectStep = 2; imageSizeStep = 3; calloutsStep = 4; } 
    else { uploadStep = 0; productSelectStep = 1; imageSizeStep = 2; calloutsStep = 3; }
  } else { 
     if (scriptingMode === 'reference') { uploadStep = 1; productSelectStep = 2; calloutsStep = 3; } 
     else { uploadStep = 0; productSelectStep = 1; calloutsStep = 2; }
  }


  return (
    <div className="min-h-screen bg-[var(--gs-bottle-green)] text-[var(--gs-off-white)] p-4 sm:p-8 flex flex-col items-center justify-center">
      
      {globalError && (
         <AlertMessage type={globalError.startsWith("Critical") ? "error" : "warning"} message={globalError} className="mb-6 max-w-4xl w-full" />
      )}
       {error && !isLoading && !globalError && ( 
          <AlertMessage type="error" message={error} className="mb-6 max-w-4xl w-full" />
       )}


      <div className="w-full max-w-4xl bg-[var(--gs-bottle-green-lighter)] shadow-2xl rounded-xl p-6 sm:p-8 flex flex-col items-center space-y-6">
        <header className="w-full text-center relative">
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--gs-mint)]">
            Creative Strategy Bot
          </h1>
          <p className="mt-2 text-lg text-[var(--gs-slate)]">
            Generate video ad scripts or static ad creatives. Use reference content or generate fresh ideas.
          </p>
          <button
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-0 right-0 p-2 text-[var(--gs-mint)] hover:text-[var(--gs-mint-darker)] transition-colors"
              aria-label="Open Settings"
              title="Open Settings"
          >
              <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </header>

        <section className="flex justify-center space-x-4 mb-1">
            <button onClick={() => handleAppModeChange('video')} className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${appMode === 'video' ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] shadow-xl' : 'bg-[var(--gs-dark-grey-6)] text-[var(--gs-slate)] hover:bg-[var(--gs-dark-grey-4)]'}`}>Video Ads</button>
            <button onClick={() => handleAppModeChange('static')} className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all ${appMode === 'static' ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] shadow-xl' : 'bg-[var(--gs-dark-grey-6)] text-[var(--gs-slate)] hover:bg-[var(--gs-dark-grey-4)]'}`}>Static Ads</button>
        </section>

        <div className="flex flex-col items-center">
            <section className="flex justify-center space-x-4 mb-3">
                <button onClick={() => handleScriptingModeChange('reference')} className={`px-6 py-2 rounded-lg font-medium transition-all ${scriptingMode === 'reference' ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] shadow-md' : 'bg-[var(--gs-dark-grey-6)] text-[var(--gs-slate)] hover:bg-[var(--gs-dark-grey-4)]'}`}>Reference Mode</button>
                <button onClick={() => handleScriptingModeChange('fresh')} className={`px-6 py-2 rounded-lg font-medium transition-all ${scriptingMode === 'fresh' ? 'bg-[var(--gs-mint)] text-[var(--gs-tide-white)] shadow-md' : 'bg-[var(--gs-dark-grey-6)] text-[var(--gs-slate)] hover:bg-[var(--gs-dark-grey-4)]'}`}>Fresh Mode</button>
            </section>
            <p className="text-sm text-center text-[var(--gs-slate)] -mt-1 max-w-md">
                {appMode === 'video' && scriptingMode === 'reference' && 'Upload an ad video, select a product (Workshop/IP), and optionally add callouts to get one adapted script.'}
                {appMode === 'video' && scriptingMode === 'fresh' && 'Select a product (Workshop/IP), optionally add callouts, to generate 3 new video script variations with unique hooks.'}
                {appMode === 'static' && scriptingMode === 'reference' && 'Upload a reference static ad, select product, size, and callouts to get an adapted static ad.'}
                {appMode === 'static' && scriptingMode === 'fresh' && 'Select product, size, and callouts to generate a fresh static ad.'}
            </p>
        </div>

        <section className="w-full space-y-6">
          {appMode === 'video' && scriptingMode === 'reference' && uploadStep > 0 && (
            <VideoUpload onFileChange={handleVideoFileChange} disabled={isLoading || isGeminiApiKeyMissing || isProductDataLoading || !supabaseReady} />
          )}
          {appMode === 'static' && scriptingMode === 'reference' && uploadStep > 0 && (
            <ImageUpload stepNumber={uploadStep} onFileChange={handleStaticAdFileChange} disabled={isLoading || isUserOpenAiApiKeyMissing || isGeminiApiKeyMissing || isProductDataLoading || !supabaseReady} />
          )}

          <WorkshopSelector // Component name kept, but props and logic updated for "Products"
            stepNumber={productSelectStep}
            options={productOptionsForSelector} // Changed
            selectedProductId={selectedProductId} // Changed
            onChange={handleProductChange} // Changed
            disabled={
              isLoading || isProductDataLoading || !supabaseReady ||
              (appMode === 'video' && isGeminiApiKeyMissing) ||
              (appMode === 'static' && (isUserOpenAiApiKeyMissing || isGeminiApiKeyMissing)) ||
              (scriptingMode === 'reference' && appMode === 'video' && !videoFile) ||
              (scriptingMode === 'reference' && appMode === 'static' && !staticAdFile)
            }
          />

          {appMode === 'static' && imageSizeStep > 0 && (
            <ImageSizeSelector
              stepNumber={imageSizeStep}
              selectedValue={selectedImageSize}
              onChange={handleImageSizeChange}
              disabled={ isLoading || isProductDataLoading || !supabaseReady || isUserOpenAiApiKeyMissing || isGeminiApiKeyMissing || !selectedProductId || (scriptingMode === 'reference' && !staticAdFile)} // Changed selectedWorkshop
            />
          )}

          <CalloutsInput
            stepNumber={calloutsStep}
            value={userCallouts}
            onChange={handleCalloutsChange}
            disabled={
              isLoading || isProductDataLoading || !supabaseReady ||
              (appMode === 'video' && isGeminiApiKeyMissing) ||
              (appMode === 'static' && (isUserOpenAiApiKeyMissing || isGeminiApiKeyMissing)) ||
              !selectedProductId || // Changed selectedWorkshop
              (appMode === 'static' && !selectedImageSize) ||
              (scriptingMode === 'reference' && appMode === 'video' && !videoFile) ||
              (scriptingMode === 'reference' && appMode === 'static' && !staticAdFile)
            }
          />
        </section>

        <div className="text-center pt-2">
          <button
            onClick={handleGenerate}
            disabled={
                !selectedProductId || isLoading || isProductDataLoading || !supabaseReady || // Changed selectedWorkshop
                (appMode === 'video' && isGeminiApiKeyMissing) ||
                (appMode === 'static' && (isUserOpenAiApiKeyMissing || isGeminiApiKeyMissing)) ||
                (appMode === 'video' && scriptingMode === 'reference' && !videoFile) ||
                (appMode === 'static' && !selectedImageSize) ||
                (appMode === 'static' && scriptingMode === 'reference' && !staticAdFile)
            }
            className="px-8 py-3 bg-[var(--gs-mint)] hover:bg-[var(--gs-mint-darker)] text-[var(--gs-tide-white)] font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? 'Generating...' : (appMode === 'video' ? 'Generate Scripts' : 'Generate Ad')}
          </button>
        </div>
      </div>
      
      <div className="w-full max-w-4xl mt-10 space-y-8">
        {isLoading && <LoadingSpinner message={currentStage} />}
        
        {appMode === 'video' && scriptingMode === 'reference' && videoAnalysisResults && !isLoading && !error && (
          <section className="p-6 bg-[var(--gs-dark-grey-6)] rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--gs-mint)]">Original Ad Analysis</h2>
            <div className="space-y-3">
              <div><h3 className="text-lg font-medium text-[var(--gs-mint)]">Visual Summary:</h3><p className="text-[var(--gs-off-white)] text-sm bg-[var(--gs-dark-grey-4)] p-3 rounded">{videoAnalysisResults.visualSummary}</p></div>
              <div><h3 className="text-lg font-medium text-[var(--gs-mint)]">Transcription:</h3><p className="text-[var(--gs-off-white)] text-sm bg-[var(--gs-dark-grey-4)] p-3 rounded max-h-48 overflow-y-auto">{videoAnalysisResults.transcription}</p></div>
              <div><h3 className="text-lg font-medium text-[var(--gs-mint)]">Original Script Analysis:</h3><div className="text-[var(--gs-off-white)] text-sm bg-[var(--gs-dark-grey-4)] p-3 rounded"><p><strong>Tone:</strong> {videoAnalysisResults.originalScriptAnalysis.tone}</p><p><strong>Structure:</strong> {videoAnalysisResults.originalScriptAnalysis.structure}</p><p><strong>Hooks:</strong> {videoAnalysisResults.originalScriptAnalysis.hooks.join(', ') || 'N/A'}</p><p><strong>CTAs:</strong> {videoAnalysisResults.originalScriptAnalysis.ctas.join(', ') || 'N/A'}</p></div></div>
            </div>
          </section>
        )}
        {appMode === 'video' && rewrittenScripts.length > 0 && !isLoading && !error && (
          <ScriptOutputDisplay scripts={rewrittenScripts} mode={scriptingMode} />
        )}

        {appMode === 'static' && generatedStaticAds.length > 0 && !isLoading && !error && (
            <StaticAdOutputDisplay ads={generatedStaticAds} />
        )}
      </div>

      {isSettingsOpen && (
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentReferenceSystemPrompt={referenceSystemPrompt}
          onReferenceSystemPromptChange={setReferenceSystemPrompt}
          currentFreshSystemPrompt={freshSystemPrompt}
          onFreshSystemPromptChange={setFreshSystemPrompt}
          currentOpenAiApiKey={userOpenAiApiKey || ''}
          onOpenAiApiKeyChange={handleUserOpenAiApiKeyChange}
          onOpenWorkshopManagement={() => { // Renamed from onOpenWorkshopManagement
             if (!supabaseReady) {
                setError("Supabase is not ready or not configured. Cannot manage product data."); // Changed
                return;
             }
            setIsWorkshopManagementModalOpen(true);
          }}
        />
      )}

      {isWorkshopManagementModalOpen && supabaseReady && (
        <WorkshopManagementModal // Component name kept, but internal logic is updated for "Products"
          isOpen={isWorkshopManagementModalOpen}
          onClose={() => setIsWorkshopManagementModalOpen(false)}
          onWorkshopsUpdated={loadProductsFromDbOrDefaults} // Renamed to onProductsUpdated internally but prop kept for now
          isGeminiConfigured={!isGeminiApiKeyMissing} // Pass Gemini configuration status
        />
      )}

      <footer className="mt-12 text-center text-[var(--gs-slate)] text-lg">
        Double-check the content I generate - I’m smart, but not that smart. 😅
      </footer>
    </div>
  );
};

export default App;
