import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../utilities/icons';
import { compressImageFile, isValidImageFile } from '../utilities/imageUtils';
import { useToast } from '../context/ToastContext';
import { isBackendConnected, uploadImage } from '../services/backend';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  aspectRatio?: 'banner' | 'video' | 'square' | 'auto';
  maxWidth?: number;
  maxHeight?: number;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'https://images.unsplash.com/...',
  helperText = 'Upload JPG, PNG, or WEBP (auto-compressed for high speed)',
  aspectRatio = 'auto',
  maxWidth = 1600,
  maxHeight = 1200,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const handleFileProcess = async (file: File) => {
    if (!isValidImageFile(file)) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).', 'error');
      return;
    }

    setIsUploading(true);
    try {
      if (!isBackendConnected()) {
        throw new Error('Backend is not connected. Please retry image upload when it is available.');
      }
      const compressedDataUrl = await compressImageFile(file, maxWidth, maxHeight, 0.85);
      const blob = await (await fetch(compressedDataUrl)).blob();
      const compressedFile = new File([blob], file.name, { type: blob.type });
      const uploadedUrl = await uploadImage(compressedFile);
      if (!uploadedUrl) {
        throw new Error('Sign in as an administrator before uploading images.');
      }
      onChange(uploadedUrl);
      showToast('Image uploaded to the store successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to process image file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    if (!tempUrl.trim()) return;
    const clean = tempUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) {
      showToast('Image URL must start with http:// or https://', 'error');
      return;
    }
    onChange(clean);
    setTempUrl('');
    setShowUrlInput(false);
    showToast('Image link applied.', 'info');
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-[21/9] sm:aspect-[16/6]';
      case 'video':
        return 'aspect-video';
      case 'square':
        return 'aspect-square max-w-[200px]';
      default:
        return 'min-h-[140px] max-h-[220px]';
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="caption-3 font-semibold text-ink flex items-center justify-between">
          <span>
            {label} {required && <span className="text-error">*</span>}
          </span>
          {value && (
            <span className="caption-5 font-semibold text-quantum">
              {value.startsWith('data:image/') ? 'Custom Uploaded' : 'Linked URL'}
            </span>
          )}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Active Image Preview Mode */}
      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-border bg-slate-50 shadow-xs flex flex-col items-center justify-center">
          <div className={`w-full overflow-hidden ${getAspectClass()}`}>
            <img
              src={value}
              alt={label || 'Uploaded preview'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-white text-ink text-xs font-semibold hover:bg-quantum hover:text-white transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={Icons.camera} className="h-3 w-3" />
              <span>Replace Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-3 py-1.5 rounded-xl bg-surface text-ink text-xs font-semibold hover:bg-surface-alt transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={Icons.external} className="h-3 w-3" />
              <span>Change URL</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('')}
              className="h-8 w-8 rounded-xl bg-error text-white text-xs hover:bg-error-dark transition-colors shadow-sm flex items-center justify-center"
              title="Remove image"
            >
              <FontAwesomeIcon icon={Icons.trash} className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileProcess(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-quantum bg-quantum-soft/40 scale-[0.99]'
              : 'border-border hover:border-quantum/70 hover:bg-surface-alt/70'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <FontAwesomeIcon icon={Icons.spinner} className="h-6 w-6 text-quantum animate-spin" />
              <span className="caption-3 font-bold text-quantum">Compressing and processing photo...</span>
            </div>
          ) : (
            <>
              <div className="h-10 w-10 rounded-2xl bg-quantum-soft text-quantum flex items-center justify-center shadow-xs">
                <FontAwesomeIcon icon={Icons.upload} className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="caption-3 font-bold text-ink block">
                  Click or drag photo here to upload
                </span>
                <span className="caption-5 text-muted block mt-0.5">
                  {helperText}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  className="btn-base bg-quantum text-white hover:bg-quantum-hover button-xsm font-semibold shadow-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FontAwesomeIcon icon={Icons.camera} className="h-3 w-3" />
                  <span>Choose Photo</span>
                </button>
                <button
                  type="button"
                  className="btn-base bg-surface border border-border text-slate-700 hover:bg-surface-alt button-xsm font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUrlInput(!showUrlInput);
                  }}
                >
                  <span>Or Paste URL</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Collapsible URL Input Field */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-2.5 bg-surface-alt rounded-xl border border-border mt-1 animate-fadeIn">
          <input
            type="url"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs text-ink bg-surface focus:outline-none focus:border-quantum"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyUrl();
              }
            }}
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="btn-base bg-quantum text-white hover:bg-quantum-hover button-xsm font-semibold"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="px-2 py-1.5 rounded-lg text-xs text-muted hover:text-ink font-semibold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
