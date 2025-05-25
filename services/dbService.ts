
// services/dbService.ts
import { supabase, isSupabaseConfigured } from '../supabaseConfig'; // Supabase setup
import { WorkshopDetailedDoc, ProductCategory } from '../types'; 

const WORKSHOPS_TABLE_NAME = 'workshops'; 
const PDF_STORAGE_BUCKET_NAME = 'workshoppdfs'; 

// Private helper to map DB record to WorkshopDetailedDoc (camelCase)
// This function is designed to be flexible: if DB returns snake_case, it maps it. If DB returns camelCase (as per user's list), 'rest' will pick it up.
const mapDbRecordToWorkshopDetailedDoc = (dbRecord: any): WorkshopDetailedDoc | null => {
    if (!dbRecord) return null;
    
    // Destructure known/expected snake_case versions first.
    // Aliases (e.g., db_target_audience) are used for clarity or to avoid potential naming conflicts if WorkshopDetailedDoc type were in scope here.
    const {
        product_category, // Confirmed snake_case
        full_description, // Potential snake_case from DB
        discount_deadline, // Potential snake_case from DB
        target_audience: db_target_audience, // Potential snake_case from DB
        learning_objectives: db_learning_objectives, // Potential snake_case from DB
        target_audience_deep_dive: db_target_audience_deep_dive, // Potential snake_case from DB
        unique_selling_points_detailed: db_unique_selling_points_detailed, // Potential snake_case from DB
        certificate_info: db_certificate_info, // Potential snake_case from DB
        registration_link: db_registration_link, // Potential snake_case from DB
        refund_policy: db_refund_policy, // Potential snake_case from DB
        pdf_original_name, // Potential snake_case from DB
        pdf_storage_path, // Potential snake_case from DB
        pdf_download_url, // Potential snake_case from DB
        created_at: db_created_at, // Potential snake_case from DB
        updated_at: db_updated_at, // Potential snake_case from DB
        ...rest // Captures all other fields, including any camelCase fields from DB (e.g., fullDescription, createdAt)
    } = dbRecord;

    // Construct WorkshopDetailedDoc, preferring explicitly destructured snake_case if available,
    // otherwise falling back to what's in 'rest' (which would be camelCase if DB sent that).
    return {
        id: rest.id, // Assumed to be 'id' in DB
        productCategory: product_category, // Mapped from product_category
        title: rest.title, 
        price: rest.price,
        
        fullDescription: full_description !== undefined ? full_description : rest.fullDescription,
        discountDeadline: discount_deadline !== undefined ? discount_deadline : rest.discountDeadline,
        targetAudience: db_target_audience !== undefined ? db_target_audience : (rest.targetAudience || []),
        learningObjectives: db_learning_objectives !== undefined ? db_learning_objectives : (rest.learningObjectives || []),
        targetAudienceDeepDive: db_target_audience_deep_dive !== undefined ? db_target_audience_deep_dive : rest.targetAudienceDeepDive,
        uniqueSellingPointsDetailed: db_unique_selling_points_detailed !== undefined ? db_unique_selling_points_detailed : (rest.uniqueSellingPointsDetailed || []),
        certificateInfo: db_certificate_info !== undefined ? db_certificate_info : rest.certificateInfo,
        registrationLink: db_registration_link !== undefined ? db_registration_link : rest.registrationLink,
        refundPolicy: db_refund_policy !== undefined ? db_refund_policy : rest.refundPolicy,
        
        pdfOriginalName: pdf_original_name !== undefined ? pdf_original_name : rest.pdfOriginalName,
        pdfStoragePath: pdf_storage_path !== undefined ? pdf_storage_path : rest.pdfStoragePath,
        pdfDownloadURL: pdf_download_url !== undefined ? pdf_download_url : rest.pdfDownloadURL,
        
        createdAt: db_created_at !== undefined ? db_created_at : rest.createdAt,
        updatedAt: db_updated_at !== undefined ? db_updated_at : rest.updatedAt,

        // Fields that are likely direct matches (lowercase or simple) and caught by ...rest
        benefits: rest.benefits || [],
        sessions: rest.sessions || [],
        mentors: rest.mentors || [],
        guarantee: rest.guarantee,
        links: rest.links || [],
        testimonials: rest.testimonials || [],
        modules: rest.modules || [],
        faqs: rest.faqs || [],
    } as WorkshopDetailedDoc;
};


export const dbService = {
  async initDB(): Promise<void> {
    if (!isSupabaseConfigured) {
      console.warn("dbService: Supabase not configured. Operations will fail.");
      return Promise.reject(new Error("Supabase not configured."));
    }
    console.log('Supabase dbService check: Supabase appears to be configured.');
    return Promise.resolve();
  },

  async uploadPdf(productId: string, pdfFile: File): Promise<{ storagePath: string; downloadURL: string; originalName: string }> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    
    const filePath = `${productId}/${pdfFile.name}`; // Standard path structure

    const { error: uploadError } = await supabase.storage
      .from(PDF_STORAGE_BUCKET_NAME)
      .upload(filePath, pdfFile, {
        cacheControl: '3600',
        upsert: true, 
      });

    if (uploadError) {
      console.error('Error uploading PDF to Supabase Storage:', uploadError);
      throw new Error(`Supabase PDF upload failed: ${(uploadError as Error).message || String(uploadError)}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(PDF_STORAGE_BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Error getting public URL for PDF from Supabase Storage. Path:', filePath);
      throw new Error('Supabase PDF upload succeeded, but failed to get public URL.');
    }
    
    return { storagePath: filePath, downloadURL: publicUrlData.publicUrl, originalName: pdfFile.name };
  },

  async deletePdf(storagePath: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    if (!storagePath) return;

    const { error } = await supabase.storage
      .from(PDF_STORAGE_BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      if ((error as any).message?.includes('Object not found')) { // Type guard for error message
         console.warn(`PDF not found in Supabase Storage for deletion: ${storagePath}`);
      } else {
        console.error(`Error deleting PDF from Supabase Storage (${storagePath}):`, error);
        throw new Error(`Supabase PDF deletion failed: ${(error as Error).message || String(error)}`);
      }
    } else {
      console.log(`PDF deleted from Supabase Storage: ${storagePath}`);
    }
  },

  async addProduct(productData: Omit<WorkshopDetailedDoc, 'pdfDownloadURL' | 'pdfStoragePath' | 'pdfOriginalName' | 'createdAt' | 'updatedAt'>, pdfFile?: File | null): Promise<WorkshopDetailedDoc> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    if (!productData.id) throw new Error('Product ID (UUID) is required to add a product.');
    if (!productData.productCategory) throw new Error('Product category is required.');
    
    // productData from app uses camelCase. We map to Supabase column names.
    // User's list indicates most Supabase columns are camelCase, except product_category.
    const { productCategory, ...camelCaseFieldsFromProductData } = productData;

    const dbRecordForInsert: any = {
        ...camelCaseFieldsFromProductData, // id, title, fullDescription, discountDeadline etc. (all assumed camelCase in DB as per user list)
        product_category: productCategory, // Explicit mapping to snake_case for this specific field
        // Timestamps: using camelCase keys as per user's Supabase column list
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (pdfFile) {
      const { storagePath, downloadURL, originalName } = await this.uploadPdf(productData.id, pdfFile);
      // PDF fields using camelCase keys as per user's Supabase column list
      dbRecordForInsert.pdfStoragePath = storagePath;
      dbRecordForInsert.pdfDownloadURL = downloadURL;
      dbRecordForInsert.pdfOriginalName = originalName;
    }
    
    const { data, error } = await supabase
      .from(WORKSHOPS_TABLE_NAME)
      .insert([dbRecordForInsert])
      .select() 
      .single(); 

    if (error) {
      console.error('Error adding product to Supabase:', error);
      throw new Error(`Supabase: Failed to add product - ${error.message}`);
    }
    const mappedData = mapDbRecordToWorkshopDetailedDoc(data);
    if (!mappedData) throw new Error("Failed to map database record after adding product.");
    return mappedData;
  },

  async getProduct(id: string): Promise<WorkshopDetailedDoc | null> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    if (!id) return null;

    const { data, error } = await supabase
      .from(WORKSHOPS_TABLE_NAME)
      .select('*') // Select all columns as defined in Supabase
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { 
        console.log(`No product found with ID in Supabase: ${id}`);
        return null;
      }
      console.error(`Error fetching product ${id} from Supabase:`, error);
      throw new Error(`Supabase: Failed to get product - ${error.message}`);
    }
    return data ? mapDbRecordToWorkshopDetailedDoc(data) : null;
  },

  async getAllProducts(): Promise<WorkshopDetailedDoc[]> {
    if (!isSupabaseConfigured || !supabase) {
        console.warn("Supabase not configured. Returning empty product list.");
        return [];
    }

    const { data, error } = await supabase
      .from(WORKSHOPS_TABLE_NAME)
      .select('*') // Select all columns
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching all products from Supabase:', error);
      throw new Error(`Supabase: Failed to get all products - ${error.message}`);
    }
    return data ? data.map(item => mapDbRecordToWorkshopDetailedDoc(item)).filter(item => item !== null) as WorkshopDetailedDoc[] : [];
  },

  async updateProduct(productData: Omit<WorkshopDetailedDoc, 'pdfDownloadURL' | 'pdfStoragePath' | 'createdAt' | 'updatedAt'>, pdfFile?: File | null, existingPdfStoragePath?: string): Promise<WorkshopDetailedDoc> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    if (!productData.id) throw new Error('Product ID (UUID) is required to update a product.');
    if (!productData.productCategory) throw new Error('Product category is required for update.');
    
    // productData from app is camelCase.
    // User's list indicates most Supabase columns are camelCase, except product_category.
    // Destructure to separate productCategory and pdfOriginalName for special handling.
    const { id, productCategory, pdfOriginalName: productDataPdfOriginalNameInput, ...otherProductFields } = productData;

    const dbRecordForUpdate: any = {
        ...otherProductFields, // title, fullDescription, etc. (assumed camelCase in DB)
        product_category: productCategory, // Explicit mapping to snake_case
        // Timestamp: using camelCase key as per user's Supabase column list
        updatedAt: new Date().toISOString(),
    };

    if (pdfFile) { 
      if (existingPdfStoragePath) {
        await this.deletePdf(existingPdfStoragePath); 
      }
      const { storagePath, downloadURL, originalName: newOriginalName } = await this.uploadPdf(id, pdfFile);
      // PDF fields using camelCase keys
      dbRecordForUpdate.pdfStoragePath = storagePath;
      dbRecordForUpdate.pdfDownloadURL = downloadURL;
      dbRecordForUpdate.pdfOriginalName = newOriginalName;
    } else if (productDataPdfOriginalNameInput === undefined && existingPdfStoragePath) { 
      // User explicitly cleared the PDF name, and there was an existing PDF
      await this.deletePdf(existingPdfStoragePath);
      dbRecordForUpdate.pdfStoragePath = null; 
      dbRecordForUpdate.pdfDownloadURL = null;
      dbRecordForUpdate.pdfOriginalName = null;
    } else if (productDataPdfOriginalNameInput) {
      // User provided a PDF name (could be same or different), but no new file upload.
      // We assume this means they want to keep/update the name field.
      // If there was an existing PDF path, we need to ensure it's preserved if not changing the file.
      dbRecordForUpdate.pdfOriginalName = productDataPdfOriginalNameInput;
      if (existingPdfStoragePath && !pdfFile) { // If there was an old PDF and no new one uploaded
         // Query current storage paths to preserve them if only name changed.
         // This is a safeguard; ideally, pdfOriginalName alone shouldn't imply keeping old paths if user removed file.
         // This logic assumes user only changed the text field for pdfOriginalName.
        const { data: currentProductFromDb } = await supabase.from(WORKSHOPS_TABLE_NAME).select('pdfStoragePath, pdfDownloadURL').eq('id', id).single();
        if (currentProductFromDb) {
            dbRecordForUpdate.pdfStoragePath = currentProductFromDb.pdfStoragePath;
            dbRecordForUpdate.pdfDownloadURL = currentProductFromDb.pdfDownloadURL;
        }
      }
    }
    // If productDataPdfOriginalNameInput is undefined and no pdfFile, and no existingPdfStoragePath, pdf fields remain untouched unless set to null above.


    const { data, error } = await supabase
      .from(WORKSHOPS_TABLE_NAME)
      .update(dbRecordForUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating product ${id} in Supabase:`, error);
      throw new Error(`Supabase: Failed to update product - ${error.message}`);
    }
    const mappedData = mapDbRecordToWorkshopDetailedDoc(data);
    if (!mappedData) throw new Error("Failed to map database record after updating product.");
    return mappedData;
  },

  async deleteProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");
    if (!id) throw new Error('Product ID (UUID) is required to delete a product.');

    // Fetch the product to get pdfStoragePath (camelCase from DB as per user list) before deleting the record
    const { data: productToDeleteRaw, error: fetchError } = await supabase.from(WORKSHOPS_TABLE_NAME).select('pdfStoragePath').eq('id', id).single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine if deleting non-existent
        console.error(`Error fetching product for PDF path before deletion (${id}):`, fetchError);
        // Decide if to throw or proceed with record deletion
    }
    
    const { error } = await supabase
      .from(WORKSHOPS_TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting product ${id} from Supabase:`, error);
      throw new Error(`Supabase: Failed to delete product - ${error.message}`);
    }

    if (productToDeleteRaw && productToDeleteRaw.pdfStoragePath) {
      await this.deletePdf(productToDeleteRaw.pdfStoragePath);
    }
  },

  async clearAllProducts(): Promise<void> { 
    if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured or client not available.");

    console.warn("Attempting to clear ALL products from Supabase. This is a destructive operation.");
    const products = await this.getAllProducts(); 
    const deletePromises: Promise<void>[] = [];
    for (const p of products) {
      if (p.id) { 
        deletePromises.push(this.deleteProduct(p.id)); 
      }
    }
    await Promise.all(deletePromises);
    console.log("All products cleared from Supabase and associated PDFs from Storage.");
  }
};
