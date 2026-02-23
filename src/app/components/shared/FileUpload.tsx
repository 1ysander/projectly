import { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload?: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  className?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
}

export function FileUpload({
  onUpload,
  accept = '.pdf,.csv,.png,.jpg,.jpeg',
  maxSize = 10,
  multiple = false,
  className = '',
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type === 'application/pdf') return FileText;
    return File;
  };

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = fileArray.map((file) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return null;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const uploadedFile: UploadedFile = {
        file,
        id,
        status: 'uploading',
        progress: 0,
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, preview: e.target?.result as string } : f))
          );
        };
        reader.readAsDataURL(file);
      }

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (f.id === id && f.status === 'uploading') {
              const newProgress = Math.min((f.progress || 0) + 10, 90);
              return { ...f, progress: newProgress };
            }
            return f;
          })
        );
      }, 100);

      // Complete upload after 1.5 seconds
      setTimeout(() => {
        clearInterval(interval);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'success', progress: 100 } : f
          )
        );
        toast.success(`${file.name} uploaded successfully`);
        if (onUpload) {
          onUpload([file]);
        }
      }, 1500);

      return uploadedFile;
    }).filter((f): f is UploadedFile => f !== null);

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const FileIcon = ({ file }: { file: File }) => {
    const Icon = getFileIcon(file);
    return <Icon size={20} className="text-muted-foreground" />;
  };

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-cobalt bg-cobalt-light/20'
            : 'border-border hover:border-cobalt/40 hover:bg-accent/30'
        }`}
      >
        <Upload size={28} className="text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-[0.9rem] text-muted-foreground" style={{ fontWeight: 500 }}>
          {isDragging ? 'Drop files here' : 'Upload receipts or invoices'}
        </p>
        <p className="text-[0.78rem] text-muted-foreground/60 mt-1">
          PDF, CSV, or image files (max {maxSize}MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border"
            >
              {uploadedFile.preview ? (
                <img
                  src={uploadedFile.preview}
                  alt={uploadedFile.file.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-cobalt-light flex items-center justify-center">
                  <FileIcon file={uploadedFile.file} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[0.85rem] truncate" style={{ fontWeight: 500 }}>
                  {uploadedFile.file.name}
                </p>
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cobalt rounded-full transition-all"
                        style={{ width: `${uploadedFile.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {uploadedFile.status === 'success' && (
                  <p className="text-[0.75rem] text-success mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Uploaded
                  </p>
                )}
                {uploadedFile.status === 'error' && (
                  <p className="text-[0.75rem] text-danger mt-0.5 flex items-center gap-1">
                    <AlertCircle size={12} /> Error
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(uploadedFile.id);
                }}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center cursor-pointer"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
