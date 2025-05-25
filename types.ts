
export enum WorkshopType {
  MARKETING = "Marketing Mastermind",
  GEN_AI = "GenAI Mastermind",
  ENGINEERING = "Engineering Mastermind",
  BUSINESS = "Business Mastermind",
}

export enum ProductCategory {
  WORKSHOP = "WORKSHOP",
  IP = "IP",
}

export type ScriptMode = 'reference' | 'fresh';
export type AppMode = 'video' | 'static';

export type ImageSize = '1:1' | '9:16' | '16:9' | '4:5';

export interface ImageSizeOption {
  value: ImageSize;
  label: string;
}

// For UI selectors for products
export interface ProductOption {
  value: string; // Will be the product's unique ID (UUID)
  label: string; // Will be the product's title
}

// This specific WorkshopOption is for constants.ts to map WorkshopType to JSON files
export interface LegacyWorkshopOption {
  value: WorkshopType; // Still WorkshopType for mapping to default JSONs
  label: string;
}


export interface SessionInfo {
  session: string;
  time?: string;
  day?: string;
  description?: string | string[]; // Can be a single string or array of strings
}

export interface WorkshopDetails { // This is effectively the summary view, now more generic ProductDetails
  title: string;
  price?: string;
  discountDeadline?: string;
  benefits: string[];
  targetAudience: string[];
  sessions: SessionInfo[];
  mentors?: string[];
  guarantee?: string;
  certificateInfo?: string;
  links?: string[];
  testimonials?: string[];
  registrationLink?: string;
  refundPolicy?: string;
}

export interface ScriptAnalysisData {
  tone: string;
  structure: string;
  hooks: string[];
  ctas: string[];
}

export interface VideoAnalysisResults {
  transcription: string;
  visualSummary: string;
  originalScriptAnalysis: ScriptAnalysisData;
}

export interface ScriptHook {
  id: string;
  text: string;
}

export interface RewrittenScriptVariation {
  id: string; // e.g., "version_20s" or "adapted_script"
  durationLabel?: string; // e.g., "20 Seconds" (for tab display) - Optional for reference mode
  versionTitle?: string; // e.g., "20-Second Version" - Optional for reference mode
  description?: string; // e.g., "With 3 alternative hooks" - Optional for reference mode
  hooks: ScriptHook[]; // Array of hook options - Can be single for reference mode
  body: string;
  cta: string;
  estimatedDurationText?: string; // e.g., "Estimated ~20 seconds" - Optional for reference mode
}

export interface GeneratedStaticAd {
  id: string;
  imageUrl: string; // base64 data URL
  promptUsed: string;
  referenceAnalysis?: string; // Optional analysis of reference image
}


// Detailed Workshop Documentation Types
export interface WorkshopModule {
  title: string;
  content: string;
  keywords?: string[];
}

export interface WorkshopFAQ {
  question: string;
  answer: string;
}

// This is the comprehensive type stored in Supabase, now representing a Product
export interface WorkshopDetailedDoc extends WorkshopDetails {
  id: string; // Unique identifier (e.g., UUID)
  productCategory: ProductCategory; // WORKSHOP or IP

  fullDescription?: string;
  modules?: WorkshopModule[];
  learningObjectives?: string[];
  targetAudienceDeepDive?: string; 
  uniqueSellingPointsDetailed?: string[];
  faqs?: WorkshopFAQ[];
  
  // Supabase Storage related fields for PDF
  pdfOriginalName?: string; // Original name of the uploaded PDF file
  pdfStoragePath?: string; // Path in Supabase Storage (e.g., "product_pdfs/UUID/report.pdf")
  pdfDownloadURL?: string; // Publicly accessible URL to the PDF in Supabase Storage
  
  createdAt?: string;
  updatedAt?: string;
}

export interface RewriteScriptForReferenceParams {
  originalTranscription: string;
  visualSummary: string;
  originalScriptAnalysis: ScriptAnalysisData;
  workshopDetails: WorkshopDetails; // Summary for quick reference (now ProductDetails)
  detailedDocumentation?: WorkshopDetailedDoc; // Full doc, potentially from PDF-informed fields
  userCallouts?: string;
}

export interface GenerateFreshScriptsParams {
  workshopDetails: WorkshopDetails; // Summary for quick reference (now ProductDetails)
  detailedDocumentation?: WorkshopDetailedDoc; // Full doc, potentially from PDF-informed fields
  userCallouts?: string;
}

export interface GenerateImagePromptParams {
  workshopDetails: WorkshopDetails; // Summary (now ProductDetails)
  detailedDocumentation?: WorkshopDetailedDoc; // Full doc
  userCallouts?: string;
  imageSize: ImageSize;
  referenceImageFile?: File; // For reference mode
  referenceImageAnalysisPrompt?: string; // Specific prompt for analyzing reference image
}

export interface ImagePromptGenerationResult {
    generatedImagePrompt: string;
    referenceImageAnalysis?: string; // Optional text analysis of the reference image
}
