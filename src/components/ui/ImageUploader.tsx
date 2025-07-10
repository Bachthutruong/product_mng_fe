import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  existingImages?: { url: string; publicId: string }[];
  onRemoveExistingImage?: (publicId: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesChange, 
  existingImages = [], 
  onRemoveExistingImage 
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onFilesChange(newFiles);

    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [files, onFilesChange]);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    URL.revokeObjectURL(previews[index]); // Clean up memory
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setFiles(newFiles);
    setPreviews(newPreviews);
    onFilesChange(newFiles);
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
  } as any); // Using 'as any' to bypass type issue

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 px-4 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        )}
      >
        <input {...(getInputProps() as any)} />
        <UploadCloud className="w-8 h-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="mt-2 text-sm text-primary">將圖片拖放到此處</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">點擊以上傳</span> 或拖放
          </p>
        )}
        <p className="text-xs text-muted-foreground">支持 PNG, JPG, GIF, WEBP</p>
      </div>

      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {existingImages.map((image) => (
            <div key={image.publicId} className="relative group aspect-square">
              <img src={image.url} alt="已上傳圖片" className="object-cover w-full h-full rounded-md" />
              {onRemoveExistingImage && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveExistingImage(image.publicId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={preview} alt={`預覽 ${index + 1}`} className="object-cover w-full h-full rounded-md" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 