"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/actions/auth";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = "event-banners";

/**
 * Upload event banner to Supabase Storage
 * Validates file type and size
 * Returns signed URL for display
 */
export async function uploadEventBanner(
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: "Only PNG and JPG files are allowed" };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File size must not exceed 5MB" };
    }

    const supabase = await createClient();

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const extension = file.type === "image/jpeg" ? "jpg" : "png";
    const fileName = `${session.user.id}/${timestamp}-${randomStr}.${extension}`;

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !data) {
      console.error("[uploadEventBanner]", uploadError);
      return { success: false, error: "Failed to upload banner" };
    }

    // Get signed URL (valid for 1 year)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 365 * 24 * 60 * 60);

    if (urlError || !signedUrl) {
      console.error("[uploadEventBanner] Sign URL failed:", urlError);
      return { success: false, error: "Failed to generate banner URL" };
    }

    return { success: true, url: signedUrl.signedUrl };
  } catch (error) {
    console.error("[uploadEventBanner]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete event banner from storage
 */
export async function deleteEventBanner(
  bannerUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Extract path from URL
    const url = new URL(bannerUrl);
    const pathParts = url.pathname.split("/storage/v1/s3/");
    if (pathParts.length !== 2) {
      return { success: false, error: "Invalid banner URL" };
    }

    const filePath = decodeURIComponent(pathParts[1]);
    const supabase = await createClient();

    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteError) {
      console.error("[deleteEventBanner]", deleteError);
      return { success: false, error: "Failed to delete banner" };
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteEventBanner]", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
