import React, { useState, useRef } from 'react';
import { Upload, File, X, FileText, Image, Code, Archive, Video, Music, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
  uploadedFile: File | null;
  isUploading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  onFileRemove, 
  uploadedFile, 
  isUploading 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes('image')) return <Image className="w-5 h-5 text-green-500" />;
    if (fileType.includes('text') || fileType.includes('markdown')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (fileType.includes('json') || fileType.includes('xml')) return <Code className="w-5 h-5 text-purple-500" />;
    if (fileType.includes('word') || fileType.includes('excel') || fileType.includes('powerpoint')) return <File className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-5 h-5 text-gray-500" />;
    if (fileType.includes('video')) return <Video className="w-5 h-5 text-pink-500" />;
    if (fileType.includes('audio')) return <Music className="w-5 h-5 text-indigo-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const getFileTypeName = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('image')) return 'Image';
    if (fileType.includes('text') || fileType.includes('markdown')) return 'Text';
    if (fileType.includes('json') || fileType.includes('xml')) return 'Code';
    if (fileType.includes('word')) return 'Word';
    if (fileType.includes('excel')) return 'Excel';
    if (fileType.includes('powerpoint')) return 'PowerPoint';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'Archive';
    if (fileType.includes('video')) return 'Video';
    if (fileType.includes('audio')) return 'Audio';
    return 'File';
  };

  const handleFile = (file: File) => {
    setError('');
    
    if (!allowedTypes.includes(file.type)) {
      setError('File type not supported. Please upload a supported file type.');
      return;
    }
    
    if (file.size > maxFileSize) {
      setError('File size too large. Maximum size is 10MB.');
      return;
    }
    
    onFileUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <div className="file-upload-container bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getFileIcon(uploadedFile.type)}
            <div>
              <div className="text-sm font-medium text-gray-200">{uploadedFile.name}</div>
              <div className="text-xs text-gray-400">
                {getFileTypeName(uploadedFile.type)} • {formatFileSize(uploadedFile.size)}
              </div>
            </div>
          </div>
          <button
            onClick={onFileRemove}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>File uploaded successfully! You can now ask questions about this file.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-container">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-blue-500 bg-blue-900/20' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={allowedTypes.join(',')}
          onChange={handleChange}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${
            dragActive ? 'bg-blue-900/30' : 'bg-gray-800'
          }`}>
            <Upload className={`w-6 h-6 ${
              dragActive ? 'text-blue-400' : 'text-gray-400'
            }`} />
          </div>
          
          <div>
            <div className="text-lg font-medium text-gray-200 mb-2">
              {dragActive ? 'Drop your file here' : 'Upload a file to analyze'}
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Support for PDF, Word, Excel, PowerPoint, Images, Text files, and more
            </div>
            
            <button
              onClick={handleClick}
              disabled={isUploading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500">
            Drag and drop or click to browse • Max 10MB
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
