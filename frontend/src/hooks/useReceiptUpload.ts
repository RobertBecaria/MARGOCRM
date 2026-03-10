import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { uploadFile } from "../api/uploads";
import { toast } from "../components/ui/Toast";
import { getApiError } from "../utils/errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export function useReceiptUpload() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file || uploadingRef.current) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("common.invalidFileType"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("common.fileTooLarge"));
      return;
    }

    uploadingRef.current = true;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onSuccess(result.url);
    } catch (err: unknown) {
      toast.error(getApiError(err, t("common.error")));
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return { uploading, inputRef, handleUpload };
}
