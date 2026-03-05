import { useState, useRef } from "react";
import { uploadFile } from "../api/uploads";
import { toast } from "../components/ui/Toast";

export function useReceiptUpload() {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onSuccess(result.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return { uploading, inputRef, handleUpload };
}
