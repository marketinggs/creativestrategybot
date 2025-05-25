
import { GoogleGenAI, GenerateContentResponse, Part, Content } from '@google/genai';
import OpenAI from 'openai';
import { 
    GEMINI_VIDEO_MODEL, GEMINI_TEXT_MODEL,
    OPENAI_IMAGE_MODEL
    // STATIC_AD_REFERENCE_PROMPT_SYSTEM_INSTRUCTION and STATIC_AD_FRESH_PROMPT_SYSTEM_INSTRUCTION are now passed as params
} from '../constants';
import { 
    VideoAnalysisResults, RewriteScriptForReferenceParams, GenerateFreshScriptsParams, 
    RewrittenScriptVariation, WorkshopDetailedDoc, WorkshopDetails, GenerateImagePromptParams,
    ImagePromptGenerationResult, ImageSize, WorkshopModule, WorkshopFAQ, SessionInfo
} from '../types';

// Helper to convert File to GenerativePart (for Gemini)
async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

// Function to parse JSON response from Gemini, handling potential markdown fences
function parseJsonFromGeminiResponse<T>(response: GenerateContentResponse, functionNameForError: string, expectArray: boolean = true): T {
  console.log(`[${functionNameForError}] Raw Gemini Response Text:`, response.text);
  let text = response.text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = text.match(fenceRegex);
  if (match && match[2]) {
    text = match[2].trim();
    console.log(`[${functionNameForError}] Text after stripping markdown fences:`, text);
  }

  try {
    const parsed = JSON.parse(text);
    console.log(`[${functionNameForError}] Successfully parsed JSON:`, parsed);
    if (!expectArray && Array.isArray(parsed) && parsed.length === 1 && functionNameForError !== "generateImagePrompt" && functionNameForError !== "analyzePdfForProductDetails") {
      // For single object expectations (like rewriteScriptForReference, analyzeVideoAndScript),
      // if AI returns an array with one item, extract it.
      console.log(`[${functionNameForError}] Adjusting: Expected object, got array of one. Using first element.`);
      return parsed[0] as T;
    }
     if (expectArray && !Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      // For array expectations (like generateFreshScripts), if AI returns a single object, wrap it.
      console.warn(`[${functionNameForError}] Adjusting: Expected an array, but received a single object. Wrapping it in an array.`, parsed);
      return [parsed] as unknown as T;
    }
    return parsed as T;
  } catch (e) {
    console.error(`[${functionNameForError}] Failed to parse JSON response. Raw text was logged above.`);
    console.error(`[${functionNameForError}] Processed text attempted for parsing: `, text);
    console.error(`[${functionNameForError}] Original JSON Parse Error: `, e);
    throw new Error(`Failed to parse AI's JSON response in ${functionNameForError}. Content preview: ${text.substring(0,100)}...`);
  }
}

// Helper function to format detailed documentation for the prompt
function formatDetailedDocumentationForPrompt(detailedDoc?: WorkshopDetailedDoc): string {
  if (!detailedDoc) return "\nNo detailed workshop documentation was provided; rely on the summary.";

  // Emphasize that this information might be derived from a PDF and is critical
  let context = "\n\n== DETAILED WORKSHOP INFORMATION (Prioritize this; potentially derived from user-uploaded PDF document stored in the cloud) ==\n";
  if (detailedDoc.fullDescription) {
    context += `Full Description: ${detailedDoc.fullDescription}\n`;
  }
  if (detailedDoc.learningObjectives && detailedDoc.learningObjectives.length > 0) {
    context += `Key Learning Objectives: ${detailedDoc.learningObjectives.join('; ')}\n`;
  }
  if (detailedDoc.modules && detailedDoc.modules.length > 0) {
    context += `Modules Overview:\n${detailedDoc.modules.map(m => `  - Module: ${m.title}\n    Content Summary: ${m.content.substring(0, 200)}...`).join('\n')}\n`;
  }
  if (detailedDoc.targetAudienceDeepDive) {
    context += `In-depth Target Audience: ${detailedDoc.targetAudienceDeepDive}\n`;
  }
  if (detailedDoc.uniqueSellingPointsDetailed && detailedDoc.uniqueSellingPointsDetailed.length > 0) {
    context += `Unique Selling Points (Detailed): ${detailedDoc.uniqueSellingPointsDetailed.join('; ')}\n`;
  }
  if (detailedDoc.faqs && detailedDoc.faqs.length > 0) {
    context += `FAQs:\n${detailedDoc.faqs.map(f => `  - Q: ${f.question}\n    A: ${f.answer}`).join('\n')}\n`;
  }
  if (detailedDoc.pdfOriginalName) { // Use pdfOriginalName to indicate a PDF is associated
    context += `Associated PDF Document: ${detailedDoc.pdfOriginalName} (Content summarized above/below. This PDF is stored in the cloud and its content should be reflected in the provided text fields.).\n`;
  }
  context += "== END OF DETAILED WORKSHOP INFORMATION ==";
  return context;
}

function formatUserCalloutsForPrompt(userCallouts?: string): string {
  if (!userCallouts || userCallouts.trim() === "") return "";
  return `\n\n== USER SPECIFIC CALLOUTS/REQUESTS ==\n${userCallouts}\n== END OF USER SPECIFIC CALLOUTS/REQUESTS ==\nConsider these specific requests carefully.`;
}

function getImageSizePromptText(imageSize: ImageSize): string {
    switch (imageSize) {
        case '1:1': return "square (1:1 aspect ratio)";
        case '9:16': return "vertical story/reel format (9:16 aspect ratio)";
        case '16:9': return "wide banner (16:9 aspect ratio)";
        case '4:5': return "portrait post format (4:5 aspect ratio)";
        default: return "standard aspect ratio";
    }
}


export async function analyzeVideoAndScript(ai: GoogleGenAI, videoFile: File): Promise<VideoAnalysisResults> {
  console.log("[analyzeVideoAndScript] Starting video analysis...");
  try {
    const videoPart = await fileToGenerativePart(videoFile);
    const videoAnalysisPromptText = `Analyze this video thoroughly. Provide the following in JSON format:
      1.  "transcription": A precise transcription of all spoken words.
      2.  "visualSummary": A concise summary of the key visuals, scenes, and on-screen text.
      3.  "originalScriptAnalysis": An object containing:
          -   "tone": Describe the overall tone and style of the video (e.g., "energetic and motivational", "formal and informative").
          -   "structure": Briefly outline the video's structure (e.g., "Problem-Solution-CTA", "Story-Demonstration-Offer").
          -   "hooks": Identify any opening statements or questions designed to grab attention (list up to 3 as strings). If none, provide an empty array.
          -   "ctas": List any calls to action mentioned (list up to 3 as strings). If none, provide an empty array.
      Do not include any introductory text or markdown formatting before or after the JSON object.
      Example JSON structure:
      {
        "transcription": "Welcome to our channel! Today we're talking about...",
        "visualSummary": "The video shows a person speaking directly to the camera, with occasional b-roll footage of nature scenes and on-screen text highlighting key points like 'Tip 1' and 'Success'.",
        "originalScriptAnalysis": {
          "tone": "Informal and friendly",
          "structure": "Introduction - Main Content (3 tips) - Summary - CTA",
          "hooks": ["Are you tired of X?", "In this video, I'll show you Y."],
          "ctas": ["Subscribe for more!", "Visit our website!"]
        }
      }`;
    
    const videoAnalysisPromptParts: Part[] = [ videoPart, {text: videoAnalysisPromptText} ];
    console.log("[analyzeVideoAndScript] Prompt being sent (parts):", videoAnalysisPromptParts);

    const analysisResponse = await ai.models.generateContent({
        model: GEMINI_VIDEO_MODEL,
        contents: { parts: videoAnalysisPromptParts },
        config: { responseMimeType: "application/json" }
    });

    const results = parseJsonFromGeminiResponse<VideoAnalysisResults>(analysisResponse, "analyzeVideoAndScript", false);
    console.log("[analyzeVideoAndScript] Successfully parsed results:", results);
    return results;

  } catch (error) {
    console.error("Error in analyzeVideoAndScript:", error);
    if (error instanceof Error && (error.message.includes("API Key not valid") || error.message.includes("API key is invalid"))) {
      throw new Error("Invalid Gemini API Key for video analysis.");
    }
    throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function rewriteScriptForReference(
  ai: GoogleGenAI,
  params: RewriteScriptForReferenceParams,
  customSystemPromptText: string
): Promise<RewrittenScriptVariation> { 
  console.log("[rewriteScriptForReference] Starting script adaptation...");
  const { originalTranscription, visualSummary, originalScriptAnalysis, workshopDetails, detailedDocumentation, userCallouts } = params;

  const systemInstruction: Content = {
    role: "system",
    parts: [{ text: customSystemPromptText }]
  };
  
  const detailedDocContext = formatDetailedDocumentationForPrompt(detailedDocumentation);
  const userCalloutsContext = formatUserCalloutsForPrompt(userCallouts);

  const prompt = `
    Original Video Details to Adapt:
    - Transcription Snippet: "${originalTranscription.substring(0, 2000)}..."
    - Visual Context: "${visualSummary}"
    - Original Tone to Emulate: "${originalScriptAnalysis.tone}"
    - Original Structure to Follow: "${originalScriptAnalysis.structure}"

    Target Workshop Summary Details to Integrate:
    - Title: "${workshopDetails.title}"
    - Core Benefits: ${JSON.stringify(workshopDetails.benefits.slice(0,3))}
    - Target Audience: ${JSON.stringify(workshopDetails.targetAudience.slice(0,2))}
    ${workshopDetails.registrationLink ? `- Registration Info for CTA: "${workshopDetails.registrationLink}"` : ''}
    ${ detailedDocContext } 
    ${ userCalloutsContext }

    Task:
    Your primary goal is to **TRANSFORM** the provided 'Original Video Details - Transcription Snippet' to promote the '${workshopDetails.title}'.
    The 'body' of your generated script MUST be a **DEEP ADAPTATION** of the 'Original Video Details - Transcription Snippet'.
    While preserving the original video's narrative flow, sentence structure, and style, you must **ACTIVELY REWEAVE the content with specific details from the workshop, prioritizing the DETAILED WORKSHOP INFORMATION if available (potentially derived from a PDF).**
    This is not just about changing titles or names. You must:
    1.  **Integrate Workshop Specifics:** Look for opportunities within the original transcription to:
        *   **Substitute** general phrases with specific examples, benefits, module names, or learning objectives from the 'Target Workshop Summary Details' and especially the 'DETAILED WORKSHOP INFORMATION'. 
        *   **Expand** on points where workshop content naturally fits.
        *   **Rephrase** sentences to directly address the workshop's target audience.
    2.  **Incorporate User Callouts:** If 'USER SPECIFIC CALLOUTS/REQUESTS' are provided, ensure the script addresses or incorporates these points thoughtfully.
    3.  **Maintain Original Core:** Ensure the core message and structure of the original video remain recognizable.
    4.  **Demonstrable Integration:** The adapted script body should CLEARLY reflect the workshop's content.

    Return ONLY a single valid JSON object (not an array) with the following structure:
    {
      "id": "adapted_script_for_${workshopDetails.title.replace(/\s+/g, '_').toLowerCase()}",
      "hooks": [ 
        {"id": "hook_adapted_1", "text": "A single, strong hook."}
      ],
      "body": "This is the main script body... meaningfully woven in. User callouts... reflected here.",
      "cta": "A clear call to action relevant to the workshop..."
    }
    Ensure the 'body' is a substantial and faithful adaptation with clear, meaningful integrations. The 'hooks' array should contain one primary, relevant hook.
  `;
  console.log("[rewriteScriptForReference] System Instruction:", customSystemPromptText);
  console.log("[rewriteScriptForReference] Prompt being sent to Gemini:", prompt);

  try {
    const rewriteResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: { parts: [{text: prompt}] },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction
        }
    });
    
    const adaptedScript = parseJsonFromGeminiResponse<RewrittenScriptVariation>(rewriteResponse, "rewriteScriptForReference", false);

    if (!adaptedScript || typeof adaptedScript.id !== 'string' || 
        !Array.isArray(adaptedScript.hooks) || 
        !adaptedScript.hooks.every(h => typeof h.id === 'string' && typeof h.text === 'string') ||
        typeof adaptedScript.body !== 'string' ||
        typeof adaptedScript.cta !== 'string') {
        console.error("[rewriteScriptForReference] Adapted script has missing or invalid fields after parsing.", adaptedScript);
        throw new Error("Adapted script from AI has missing or invalid fields.");
    }
    console.log("[rewriteScriptForReference] Successfully parsed and validated adapted script:", adaptedScript);
    return adaptedScript;

  } catch (error) {
    console.error("Error in rewriteScriptForReference:", error);
     if (error instanceof Error && (error.message.includes("API Key not valid") || error.message.includes("API key is invalid"))) {
      throw new Error("Invalid Gemini API Key for script adaptation.");
    }
    throw new Error(`Script adaptation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateFreshScripts(
  ai: GoogleGenAI,
  params: GenerateFreshScriptsParams,
  customSystemPromptText: string
): Promise<RewrittenScriptVariation[]> {
  console.log("[generateFreshScripts] Starting fresh script generation...");
  const { workshopDetails, detailedDocumentation, userCallouts } = params;

  const systemInstruction: Content = {
    role: "system",
    parts: [{ text: customSystemPromptText }]
  };
  
  const detailedDocContext = formatDetailedDocumentationForPrompt(detailedDocumentation);
  const userCalloutsContext = formatUserCalloutsForPrompt(userCallouts);

  let workshopSessionSummary = "General workshop focused on its benefits.";
  if (workshopDetails.sessions && workshopDetails.sessions.length > 0) {
    workshopSessionSummary = workshopDetails.sessions.map(s => {
        let desc = "";
        if (Array.isArray(s.description)) {
            desc = s.description.join(', ').substring(0, 70);
        } else if (s.description) {
            desc = s.description.substring(0, 70);
        }
        return `${s.session}${desc ? ': ' + desc +'...' : ''}`;
    }).slice(0,2).join('; '); 
  }

  const prompt = `
    Target Workshop Summary Details for Fresh Scripts:
    - Title: "${workshopDetails.title}"
    - Benefits: ${JSON.stringify(workshopDetails.benefits)}
    - Target Audience: ${JSON.stringify(workshopDetails.targetAudience)}
    - Key Sessions Overview (Summary): ${workshopSessionSummary}...
    ${ detailedDocContext }
    ${ userCalloutsContext }

    Task:
    Generate 3 fresh, creative, and distinct promotional script variations (targeting ~20s, ~30s, ~45s durations) for the '${workshopDetails.title}'.
    Each variation needs its own unique set of 3 hooks.
    **If DETAILED WORKSHOP INFORMATION was provided (potentially derived from a PDF), ensure scripts are rich with specifics from it.**
    **If USER SPECIFIC CALLOUTS/REQUESTS are provided, thoughtfully incorporate them.**

    Return ONLY a valid JSON array of 3 objects. Ensure every hook object in the 'hooks' array for each variation explicitly includes the "id" key with a string value, like {"id": "hook_unique_id", "text": "Hook text..."}. Example format:
    [
      {
        "id": "version_20s",
        "durationLabel": "20 Seconds",
        "versionTitle": "20-Second Version",
        "description": "With 3 alternative hooks...",
        "hooks": [
          {"id": "hook_20s_1", "text": "Exciting hook 1..."},
          {"id": "hook_20s_2", "text": "Intriguing hook 2..."},
          {"id": "hook_20s_3", "text": "Unique hook 3..."}
        ],
        "body": "This is a concise script body for 20s version...",
        "cta": "Short CTA for 20s script.",
        "estimatedDurationText": "Estimated ~20 seconds"
      }
      // ... similar structures for 30s and 45s versions ...
    ]
  `;
  console.log("[generateFreshScripts] System Instruction:", customSystemPromptText);
  console.log("[generateFreshScripts] Prompt being sent to Gemini:", prompt);

  try {
    const rewriteResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: { parts: [{text: prompt}] },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction
        }
    });
    
    const parsedVariations = parseJsonFromGeminiResponse<RewrittenScriptVariation[]>(rewriteResponse, "generateFreshScripts", true);

    if (!Array.isArray(parsedVariations) || parsedVariations.length === 0) {
        console.error("[generateFreshScripts] Parsed variations is not an array or is empty:", parsedVariations);
        throw new Error("AI response did not conform to the expected array of 3 variations for fresh scripts.");
    }
     if (parsedVariations.length !== 3) {
        console.warn(`[generateFreshScripts] Expected 3 fresh script variations, but received ${parsedVariations.length}.`, parsedVariations);
    }

    parsedVariations.forEach((variation, index) => {
        if (typeof variation.id !== 'string' || 
            typeof variation.durationLabel !== 'string' ||
            typeof variation.versionTitle !== 'string' ||
            typeof variation.description !== 'string' ||
            !Array.isArray(variation.hooks) || 
            !variation.hooks.every(h => typeof h.id === 'string' && typeof h.text === 'string') ||
            typeof variation.body !== 'string' ||
            typeof variation.cta !== 'string' ||
            typeof variation.estimatedDurationText !== 'string') {
            console.error(`[generateFreshScripts] Fresh script variation ${index + 1} (${variation.id || 'Unknown ID'}) from AI has missing or invalid fields.`, variation);
            throw new Error(`Fresh script variation ${index + 1} (${variation.id || 'Unknown ID'}) from AI has missing or invalid fields.`);
        }
         if (variation.hooks.length !== 3 && variation.id.startsWith("version_")) { 
            console.warn(`[generateFreshScripts] Variation ${variation.id} was expected to have 3 hooks, but found ${variation.hooks.length}.`);
        }
    });
    console.log("[generateFreshScripts] Successfully parsed and validated fresh scripts:", parsedVariations);
    return parsedVariations;

  } catch (error) {
    console.error("Error in generateFreshScripts:", error);
     if (error instanceof Error && (error.message.includes("API Key not valid") || error.message.includes("API key is invalid"))) {
      throw new Error("Invalid Gemini API Key for fresh script generation.");
    }
    throw new Error(`Fresh script generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// Generate Image Prompt (still uses Gemini Text Model to generate a prompt for an image model)
export async function generateImagePrompt(
  ai: GoogleGenAI, // Gemini AI client for prompt generation
  params: GenerateImagePromptParams,
  systemPromptText: string // Pass the specific system prompt (reference or fresh)
): Promise<ImagePromptGenerationResult> {
  console.log("[generateImagePrompt] Starting image prompt generation...");
  const { workshopDetails, detailedDocumentation, userCallouts, imageSize, referenceImageFile } = params;
  
  const systemInstruction: Content = {
    role: "system",
    parts: [{ text: systemPromptText }] 
  };

  const detailedDocContext = formatDetailedDocumentationForPrompt(detailedDocumentation);
  const userCalloutsContext = formatUserCalloutsForPrompt(userCallouts);
  const imageSizeText = getImageSizePromptText(imageSize); 

  let promptParts: Part[] = [];
  
  let textPromptContent = `
    Target Workshop Summary Details:
    - Title: "${workshopDetails.title}"
    - Core Benefits: ${JSON.stringify(workshopDetails.benefits.slice(0,3))}
    - Target Audience: ${JSON.stringify(workshopDetails.targetAudience.slice(0,2))}
    ${ detailedDocContext }
    ${ userCalloutsContext }

    Target Image Aspect Ratio: ${imageSizeText}
  `;

  if (referenceImageFile) {
    const imagePart = await fileToGenerativePart(referenceImageFile);
    promptParts.push(imagePart);
    textPromptContent = `You are provided with a reference image (below) and workshop details.
    ${textPromptContent}
    Task: Analyze the reference image and generate an image generation prompt as per system instructions. This prompt will be used with OpenAI's ${OPENAI_IMAGE_MODEL} model. Prioritize DETAILED WORKSHOP INFORMATION for content.`;
  } else {
     textPromptContent = `
    ${textPromptContent}
    Task: Generate an image generation prompt for a fresh ad as per system instructions. This prompt will be used with OpenAI's ${OPENAI_IMAGE_MODEL} model. Prioritize DETAILED WORKSHOP INFORMATION for content.`;
  }
  promptParts.push({ text: textPromptContent });
  console.log("[generateImagePrompt] System Instruction:", systemPromptText);
  console.log("[generateImagePrompt] Prompt parts being sent to Gemini:", promptParts);


  try {
    const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL, 
        contents: { parts: promptParts },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction
        }
    });
    
    const result = parseJsonFromGeminiResponse<ImagePromptGenerationResult>(response, "generateImagePrompt", false);

    if (!result || typeof result.generatedImagePrompt !== 'string') {
        console.error("[generateImagePrompt] Image prompt generation result is invalid after parsing:", result);
        throw new Error("AI failed to generate a valid image prompt structure.");
    }
    if (referenceImageFile && typeof result.referenceImageAnalysis !== 'string') {
        console.warn("[generateImagePrompt] Reference image analysis was expected but not found in AI response.");
    }
    console.log("[generateImagePrompt] Successfully parsed image prompt result:", result);
    return result;

  } catch (error) {
    console.error("Error in generateImagePrompt (using Gemini for prompt generation):", error);
    if (error instanceof Error && (error.message.includes("API Key not valid") || error.message.includes("API key is invalid"))) {
      throw new Error("Invalid Gemini API Key for image prompt generation.");
    }
    throw new Error(`Image prompt generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Generate Static Ad Image using OpenAI (e.g., gpt-image-1)
export async function generateStaticAdImage(
  imagePrompt: string,
  openAiApiKey: string, // User-provided OpenAI API key
  numberOfImages: number = 1
): Promise<{ id: string, imageUrl: string }[]> {
  console.log("[generateStaticAdImage] Starting static ad image generation with OpenAI...");
  if (!openAiApiKey) {
    console.error("OpenAI API Key not provided to generateStaticAdImage function.");
    throw new Error(`OpenAI API Key is missing. Please configure it in the application settings.`);
  }
  console.log("[generateStaticAdImage] Prompt for OpenAI:", imagePrompt);

  const openai = new OpenAI({
    apiKey: openAiApiKey,
    dangerouslyAllowBrowser: true, 
  });

  try {
    const response = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: imagePrompt,
      n: numberOfImages,
      // response_format: "b64_json", // This parameter is not supported by gpt-image-1 and causes 400 error
    });
    console.log("[generateStaticAdImage] Raw response from OpenAI:", response);


    if (!response.data || response.data.length === 0) {
      throw new Error(`OpenAI model '${OPENAI_IMAGE_MODEL}' did not return any images.`);
    }

    const imageData = response.data.map((imgData, index) => {
      if (!imgData.b64_json) {
        console.error(`[generateStaticAdImage] Generated image ${index} from OpenAI is missing b64_json data.`, imgData);
        throw new Error(`Generated image ${index} data from OpenAI is incomplete.`);
      }
      const imageUrl = `data:image/png;base64,${imgData.b64_json}`;
      return {
        id: `generated_image_openai_${Date.now()}_${index}`,
        imageUrl: imageUrl,
      };
    });
    console.log("[generateStaticAdImage] Processed image data:", imageData);
    return imageData;

  } catch (error) {
    console.error(`Error in generateStaticAdImage with OpenAI model '${OPENAI_IMAGE_MODEL}':`, error);
    if (error instanceof Error) {
      if (error.message.includes("Billing hard limit has been reached") || error.message.includes("quota")) {
        throw new Error("OpenAI API request failed due to billing/quota issues. Please check your OpenAI account.");
      }
      if (error.message.includes("Invalid API key") || error.message.includes("Incorrect API key")) {
         throw new Error(`Invalid OpenAI API Key provided in Settings. Please verify it.`);
      }
      if (error.message.toLowerCase().includes("safety system") || error.message.toLowerCase().includes("content policy")) {
        throw new Error(`Image generation was blocked by OpenAI's safety system due to the prompt. Prompt: "${imagePrompt.substring(0,100)}..."`);
      }
    }
    throw new Error(`Static ad image generation with OpenAI failed: ${error instanceof Error ? error.message : String(error)}. Prompt used: "${imagePrompt.substring(0,100)}..."`);
  }
}


// Type for the expected structure of data extracted from PDF by Gemini
export type ExtractedPdfProductData = Partial<Omit<WorkshopDetailedDoc, 'id' | 'productCategory' | 'pdfOriginalName' | 'pdfStoragePath' | 'pdfDownloadURL' | 'createdAt' | 'updatedAt'>>;

export async function analyzePdfForProductDetails(pdfFile: File): Promise<ExtractedPdfProductData> {
  console.log("[analyzePdfForProductDetails] Starting PDF analysis...");
  if (!process.env.API_KEY) {
    throw new Error("Gemini API Key (API_KEY environment variable) is not configured. Cannot analyze PDF.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const pdfPart = await fileToGenerativePart(pdfFile);
    const extractionPromptText = `Analyze the content of the provided PDF document, which describes a product (likely a workshop, intellectual property, or similar). Extract the following information and return it as a SINGLE VALID JSON object. Do not include any markdown formatting or other text outside the JSON object.

If a piece of information is not clearly present in the PDF:
- For string fields, use null.
- For array fields (e.g., benefits, modules, faqs), use an empty array [].

JSON Structure:
{
  "title": "string | null",
  "fullDescription": "string | null",
  "price": "string | null",
  "discountDeadline": "string | null",
  "benefits": ["string", ...],
  "targetAudience": ["string", ...],
  "learningObjectives": ["string", ...],
  "modules": [
    { "title": "string", "content": "string", "keywords": ["string", ...] | null }
    ...
  ],
  "sessions": [
    { "session": "string", "time": "string | null", "day": "string | null", "description": "string | string[] | null" }
    ...
  ],
  "mentors": ["string", ...],
  "targetAudienceDeepDive": "string | null",
  "uniqueSellingPointsDetailed": ["string", ...],
  "faqs": [
    { "question": "string", "answer": "string" }
    ...
  ],
  "guarantee": "string | null",
  "certificateInfo": "string | null",
  "links": ["string", ...],
  "testimonials": ["string", ...],
  "registrationLink": "string | null",
  "refundPolicy": "string | null"
}

Extract the information as accurately and completely as possible from the PDF content.
For 'modules', provide a title and content summary. Keywords are optional.
For 'sessions', capture name/title, and optionally time, day, and description (which can be a single string or list of points).
For 'faqs', provide question and answer pairs.
Ensure all field names in the JSON output are exactly as specified above (camelCase).
Focus on content directly present in the PDF. If the PDF is very short or lacks structured information, extract what is available.
`;
    
    const promptParts: Part[] = [pdfPart, {text: extractionPromptText}];
    console.log("[analyzePdfForProductDetails] Prompt parts being sent:", promptParts);
    
    const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL, 
        contents: { parts: promptParts },
        config: { 
            responseMimeType: "application/json",
        }
    });

    const extractedData = parseJsonFromGeminiResponse<ExtractedPdfProductData>(response, "analyzePdfForProductDetails", false);
    console.log("[analyzePdfForProductDetails] Successfully parsed extracted data:", extractedData);
    return extractedData;

  } catch (error) {
    console.error("Error in analyzePdfForProductDetails:", error);
    if (error instanceof Error && (error.message.includes("API Key not valid") || error.message.includes("API key is invalid"))) {
      throw new Error("Invalid Gemini API Key for PDF analysis.");
    }
    throw new Error(`PDF analysis for auto-fill failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
