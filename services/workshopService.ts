// import { WorkshopType, WorkshopDetails } from '../types'; // Types might still be useful if other logic is added

// The functions previously in this file (getWorkshopOptions, getWorkshopDetails)
// are now effectively superseded by the data fetching logic in `apiService.ts`
// and the state management within `App.tsx` which consumes `apiService.ts`.

// `WORKSHOP_OPTIONS` are now directly imported from `constants.ts` in `apiService.ts` and `App.tsx`.
// Workshop details (both summary and detailed) are fetched via `apiService.ts`.

// This file is being kept in case other workshop-related utility functions
// (not directly related to data fetching) are needed in the future.
// If no such functions are anticipated, this file could be removed.

export {}; // Add an empty export to ensure it's treated as a module
