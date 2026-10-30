import React, { useState, type ReactNode } from "react";
import { Accept, FileRejection, useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { cn } from "@/ds/lib/utils";

interface FileUploadProps {
  acceptTypes: Accept;
  maxFiles?: number;
  maxSizeMB?: number;
  hint?: ReactNode;
  onFilesChange?: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  acceptTypes,
  maxFiles = 10,
  maxSizeMB = 5,
  hint,
  onFilesChange,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string>("");
  const firstKey = Object.keys(acceptTypes)[0];

  const update = (next: File[]) => {
    setFiles(next);
    setMessage("");
    onFilesChange?.(next);
  };

  // Oversized and wrong-type files never get here: useDropzone routes them to onDropRejected.
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length + files.length > maxFiles) {
      setMessage(`You can only upload up to ${maxFiles} files.`);
      return;
    }
    update([...files, ...acceptedFiles]);
  };

  const onDropRejected = (fileRejections: FileRejection[]) => {
    const code = fileRejections[0]?.errors[0]?.code;
    if (code === "file-too-large") setMessage(`File too large. Max allowed size: ${maxSizeMB} MB.`);
    else if (code === "file-invalid-type") setMessage(`Invalid file type. Please upload ${firstKey} only.`);
    else if (code === "too-many-files") setMessage(`You can only upload maximum ${maxFiles} files.`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: acceptTypes,
    multiple: true,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  const defaultHint = `Supports continuous high-res JPEG, PNG, or WebP formats up to ${maxSizeMB}MB`;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        // Dashed via `style`, not the `border-dashed` class: Metronic's own unlayered `.border-dashed`
        // also sets border-color and beats Tailwind's, so the hover/drag border never changed in the app.
        style={{ borderStyle: "dashed" }}
        className={cn(
          "flex flex-col items-center justify-center rounded-3xl py-10 px-6 text-center cursor-pointer transition-all duration-200 border-2",
          isDragActive
            ? "bg-brand-25 border-brand-500"
            : "bg-gray-50 border-gray-300 hover:bg-brand-25 hover:border-brand-500",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-6 h-6 text-gray-900" />
        <p className="mt-3 text-base font-medium text-gray-900">
          Drag and drop images, or{" "}
          <span className="underline">browse files</span>
        </p>
        {hint ?? <p className="mt-2 text-sm text-gray-500">{defaultHint}</p>}
      </div>

      {message && <p className="text-red-600 text-sm">{message}</p>}

      <div className="flex flex-wrap gap-3">
        {files.map((file, index) => (
          <div key={`file-${index}`} className="relative">
            <Button
              variant="destructive"
              size="icon-xs"
              className="absolute -top-2 -right-2 z-10 size-5 rounded-full"
              onClick={() => update(files.filter((_, i) => i !== index))}
              aria-label={`Remove ${file.name}`}
            >
              <X />
            </Button>
            {file.type.startsWith("image") ? (
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-24 h-24 object-cover rounded-md border"
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center border rounded-md bg-red-50 text-red-600 font-bold">
                {file.name.split(".").pop()?.toUpperCase()}
              </div>
            )}
            <p className="text-xs mt-1 truncate w-24">{file.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUpload;
