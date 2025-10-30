import React, { useCallback, useState } from 'react';
import { UploadIcon, DocumentTextIcon, CheckCircleIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, file }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);


  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full min-h-[16rem] border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700/50 transition-colors duration-300 ease-in-out
        ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
      >
        {file ? (
            <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 p-4">
                <CheckCircleIcon className="w-12 h-12 mb-3 text-teal-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-200 break-all">{file.name}</p>
                <p className="text-xs mt-1">Ready to extract</p>
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadIcon className="w-10 h-10 mb-3 text-slate-400" />
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">PDF, PNG, JPG, or WEBP</p>
          </div>
        )}
        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, application/pdf" onChange={handleFileChange} />
      </label>
    </div>
  );
};

export default FileUpload;