
import { WorkshopType, WorkshopDetailedDoc } from '../types';
import { LEGACY_WORKSHOP_OPTIONS_FOR_SEEDING } from '../constants'; 

// Helper function to get the filename for a workshop's detailed document JSON
function getLegacyWorkshopJsonFilename(workshopType: WorkshopType): string {
  return `${workshopType.toLowerCase().replace(/\s+/g, '_')}.json`;
}

// Fetches the raw content from a default workshop JSON file.
// The `id` field from the JSON is the original WorkshopType string (e.g., "Marketing Mastermind")
// This function is primarily used for seeding the database.
export async function getDefaultWorkshopDetailedDocForSeeding(workshopType: WorkshopType): Promise<Omit<WorkshopDetailedDoc, 'id' | 'productCategory'> | null> {
  const filename = getLegacyWorkshopJsonFilename(workshopType);
  const fetchUrl = new URL(`/workshop_docs/${filename}`, window.location.origin).toString();
  try {
    const response = await fetch(fetchUrl);
    if (response.ok) {
      const rawDoc: any = await response.json(); // Read as any first
      
      // The 'id' from the JSON file (e.g., "Marketing Mastermind") is NOT used as the primary key for the new product.
      // A new UUID will be generated in App.tsx. We extract other fields.
      // The 'productCategory' will also be set in App.tsx during seeding.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: idFromFile, productCategory, ...contentFields } = rawDoc;

      console.log(`Successfully fetched default content for seeding: ${workshopType} from ${fetchUrl}`);
      return contentFields as Omit<WorkshopDetailedDoc, 'id' | 'productCategory'>;
    } else {
      console.warn(`Default detailed documentation file for seeding ${fetchUrl} not found or fetch failed (status: ${response.status}).`);
      return null;
    }
  } catch (fetchError) {
    console.error(`Error fetching default detailed documentation for seeding ${fetchUrl}:`, fetchError);
    return null;
  }
}

// This function might be deprecated or re-evaluated. 
// App.tsx now directly uses getDefaultWorkshopDetailedDocForSeeding in a loop.
// For simplicity, keeping it similar for now, but it means App.tsx iterates LEGACY_WORKSHOP_OPTIONS_FOR_SEEDING
// and calls getDefaultWorkshopDetailedDocForSeeding for each.
export async function getAllDefaultWorkshopContentsForSeeding(): Promise<Record<WorkshopType, Omit<WorkshopDetailedDoc, 'id' | 'productCategory'>>> {
  const allDefaults: Record<WorkshopType, Omit<WorkshopDetailedDoc, 'id' | 'productCategory'>> = {} as Record<WorkshopType, Omit<WorkshopDetailedDoc, 'id' | 'productCategory'>>;

  for (const option of LEGACY_WORKSHOP_OPTIONS_FOR_SEEDING) {
    const workshopType = option.value;
    const content = await getDefaultWorkshopDetailedDocForSeeding(workshopType);
    if (content) {
      allDefaults[workshopType] = content;
    } else {
      console.warn(`Default content for ${workshopType} could not be loaded for seeding.`);
      // Provide minimal fallback if JSON is missing, though App.tsx's direct call is preferred
      allDefaults[workshopType] = {
        title: option.label,
        benefits: [],
        targetAudience: [],
        sessions: [],
        fullDescription: `Default content for ${option.label}. Please edit.`,
        modules: [],
        learningObjectives: [],
        faqs: [],
      };
    }
  }
  return allDefaults;
}
