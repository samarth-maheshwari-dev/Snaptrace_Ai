import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, RotateCcw } from 'lucide-react';
import type { Descriptor, Match, PublicItem } from '../types';
import { api } from '../lib/api';
import { compressImage } from '../lib/image';
import { categoryLabel } from '../lib/catalog';
import ImagePicker, { useObjectUrl } from '../components/ImagePicker';
import MatchRow from '../components/MatchRow';
import ClaimModal from '../components/ClaimModal';
import { useToast } from '../components/Toast';
import { RequireSignIn } from '../components/SignIn';

type Phase = 'idle' | 'uploading' | 'analysing' | 'done';

const PHASE_COPY: Record<Phase, string> = {
  idle: '',
  uploading: 'Uploading photo…',
  analysing: 'Reading the photo and comparing with found items…',
  done: '',
};

function DescriptorSummary({ d }: { d: Descriptor }) {
  const facts = [
    ['Type', categoryLabel(d.category)],
    ['Colour', d.primaryColor],
    ['Brand', d.brand],
    ['Material', d.material],
    ['Size', d.size],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="card p-5">
      <p className="eyebrow">What the model saw</p>
      <p className="mt-2 text-ink">{d.itemDescription}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-5">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="capitalize">{v}</dd>
          </div>
        ))}
      </dl>
      {d.distinctiveFeatures.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {d.distinctiveFeatures.map((f) => <span key={f} className="chip">{f}</span>)}
        </div>
      )}
    </div>
  );
}

export default function SnapSearchPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const preview = useObjectUrl(file);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ descriptor: Descriptor; matches: Match[] } | null>(null);
  const [claimItem, setClaimItem] = useState<PublicItem | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  useEffect(() => {
    api.health().then((h) => setAiReady(h.ai)).catch(() => setAiReady(false));
  }, []);

  async function run() {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      setPhase('uploading');
      const base64 = await compressImage(file);
      const upload = await api.uploadImage(base64);
      if (!upload.descriptor) throw new Error(upload.aiError ?? 'The photo could not be analysed.');
      setPhase('analysing');
      setResult(await api.search(upload.imageId));
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
      setPhase('idle');
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError('');
    setPhase('idle');
  }

  const busy = phase === 'uploading' || phase === 'analysing';

  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Photo search</p>
      <h1 className="mt-3 font-display text-5xl">What did you lose?</h1>
      <p className="mt-3 max-w-xl text-muted">
        Upload a photo of the item — your own, or one from the web that looks like it. We compare it with everything
        handed in and show you the closest matches, with the reasons.
      </p>

      {aiReady === false && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
          <Info className="size-5 shrink-0" />
          <p>Photo analysis is switched off on this server (no Gemini API key). You can still <Link to="/browse" className="font-medium underline">browse items</Link>.</p>
        </div>
      )}

      {phase !== 'done' && (
        <div className="mt-8">
        <RequireSignIn reason="Photo search uses AI, so it needs an account. This keeps the service free of abuse.">
        <div className="space-y-4">
          <ImagePicker
            file={file}
            previewUrl={preview}
            onChange={(f) => { setFile(f); setError(''); }}
            onReject={(m) => toast('error', m)}
            hint="Clear, well-lit, item filling the frame works best"
          />
          {busy && (
            <div className="overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label={PHASE_COPY[phase]}>
              <div className={`h-1 bg-ink transition-[width] duration-700 ${phase === 'uploading' ? 'w-1/3' : 'w-5/6'}`} />
            </div>
          )}
          {busy && <p className="text-center text-sm text-muted">{PHASE_COPY[phase]}</p>}
          {error && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</p>}
          {file && !busy && (
            <button onClick={run} disabled={aiReady === false} className="btn-accent w-full py-3">
              Find matches
            </button>
          )}
        </div>
        </RequireSignIn>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="mt-8 space-y-8">
          <div className="flex items-center gap-4">
            {preview && <img src={preview} alt="Your photo" className="size-16 rounded-xl object-cover" />}
            <div className="flex-1">
              <p className="font-medium">
                {result.matches.length
                  ? `${result.matches.length} possible match${result.matches.length === 1 ? '' : 'es'}`
                  : 'No close matches yet'}
              </p>
              <p className="text-sm text-muted">Top results are double-checked by AI. Scores of 75+ are strong.</p>
            </div>
            <button onClick={reset} className="btn-outline">
              <RotateCcw className="size-4" /> New search
            </button>
          </div>

          <DescriptorSummary d={result.descriptor} />

          {result.matches.length > 0 ? (
            <div className="space-y-3">
              {result.matches.map((m, i) => (
                <MatchRow
                  key={m.item.id}
                  match={m}
                  rank={i}
                  action={
                    m.item.status !== 'resolved' && (
                      <button onClick={() => setClaimItem(m.item)} className="btn-primary px-4 py-2">This is mine</button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="font-medium">Nobody has handed it in yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Report it as lost — when someone reports a matching found item, it'll show up on your listing.
              </p>
              <Link to="/report?type=lost" className="btn-accent mt-5">
                Report as lost <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {claimItem && (
        <ClaimModal
          item={claimItem}
          onClose={() => setClaimItem(null)}
          onSuccess={() => {
            setClaimItem(null);
            toast('success', 'Claim sent for review', 'Staff will check your proof and email you.');
          }}
        />
      )}
    </div>
  );
}
