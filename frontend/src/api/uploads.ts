import client from "./client";

export interface UploadResult {
  url: string;
  filename: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post<UploadResult>("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
