import React, { useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { SignDocument } from '../../types';

interface ExternalSignerProps {
  document: SignDocument;
  onComplete?: () => void;
  onClose?: () => void;
}

export const ExternalSignerExperience: React.FC<ExternalSignerProps> = ({ document: doc, onComplete, onClose }) => {
  const handleFinish = () => {
    if (onComplete) onComplete();
    if (onClose) onClose();
  };
  const { signDocumentRecipient, user } = useApp();
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(user.name);
  const [isSigned, setIsSigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e40af';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleFinishSigning = () => {
    setIsSigned(true);
    signDocumentRecipient(doc.id, doc.recipients[0]?.id || 'rec-1');
    setTimeout(() => {
      handleFinish();
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Signature workspace · recipient access required</span>
        </div>
        <span className="font-mono font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50">{doc.status}</span>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">{doc.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please review document pages and sign below.</p>
        </div>

        {/* Document Preview Box */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 min-h-[200px] flex flex-col justify-between text-xs space-y-4">
          <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="font-bold text-slate-900 dark:text-slate-100">MUTUAL NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT</p>
            <p>
              This Agreement is entered into by and between <strong>NextAura Technologies Inc.</strong> and the undersigned Party. Both parties agree to protect and keep strictly confidential all proprietary financial data, AI algorithms, and business strategy shared within the NextAura platform.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Document ID: {doc.id} • Hash: 0x88f92a9...c4021
          </div>
        </div>

        {/* Signature Pad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">Draw or Type Your Signature</label>
            <div className="flex gap-1.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setSignatureType('draw')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  signatureType === 'draw' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Draw Canvas
              </button>
              <button
                onClick={() => setSignatureType('type')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  signatureType === 'type' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Type Signature
              </button>
            </div>
          </div>

          {signatureType === 'draw' ? (
            <div className="relative rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2">
              <canvas
                ref={canvasRef}
                width={500}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-36 bg-white dark:bg-slate-900 rounded-lg cursor-crosshair touch-none border border-slate-200/80 dark:border-slate-700"
              />
              <button
                onClick={clearCanvas}
                className="absolute right-4 bottom-4 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-serif text-2xl italic text-blue-700 dark:text-blue-400 tracking-wider">
                {typedName || 'Your Signature'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleFinishSigning}
          disabled={isSigned}
          className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 text-white font-medium text-xs shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSigned ? 'Signature Captured!' : 'Adopt & Sign Document'}
        </button>
      </div>
    </div>
  );
};
