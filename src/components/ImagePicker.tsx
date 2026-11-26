import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  onReject?: (message: string) => void;
  hint?: string;
  previewUrl: string | null;
}

export default function ImagePicker({ file, onChange, onReject, hint, previewUrl }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 15 * 1024 * 1024, // compressed client-side before upload
    multiple: false,
    onDropAccepted: (files) => onChange(files[0]),
    onDropRejected: (r) =>
      onReject?.(r[0]?.errors[0]?.code === 'file-too-large' ? 'That photo is too large (max 15 MB).' : 'Use a JPEG, PNG or WEBP photo.'),
  });

  if (file && previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-line bg-sunken">
        <img src={previewUrl} alt="Selected photo" className="mx-auto max-h-80 w-full object-contain" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-[var(--shadow-card)] hover:bg-surface"
        >
          <X className="size-3.5" /> Remove
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        isDragActive ? 'border-accent bg-accent-soft/60' : 'border-line-strong bg-surface hover:border-ink'
      }`}
    >
      <input {...getInputProps()} />
      <span className="grid size-12 place-items-center rounded-full bg-sunken text-ink-soft">
        <ImagePlus className="size-5" />
      </span>
      <div>
        <p className="font-medium text-ink">{isDragActive ? 'Drop it here' : 'Drop a photo or click to choose'}</p>
        <p className="mt-1 text-sm text-muted">{hint ?? 'JPEG, PNG or WEBP'}</p>
      </div>
    </div>
  );
}

/** Object URL for a File, revoked when it changes (the old code leaked these). */
export function useObjectUrl(file: File | null) {
  const url = file ? URL.createObjectURL(file) : null;
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}
