import React, { useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { SignDocument } from '../../types';

interface ExternalSignerProps {
  document: SignDocument;
  onComplete: () => void;
}

export const ExternalSignerExperience: React.FC<ExternalSignerProps> = ({ document: doc, onComplete }) => {
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
    ctx.strokeStyle = '#38bdf8';
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
      onComplete();
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Legal E-Signature Environment • 256-bit Encrypted</span>
        </div>
        <span className="font-mono font-bold uppercase">{doc.status}</span>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-slate-100 font-heading">{doc.title}</h2>
          <p className="text-xs text-slate-400 mt-1">Please review document pages and sign below.</p>
        </div>

        {/* Document Preview Box */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 min-h-[220px] flex flex-col justify-between text-xs space-y-4">
          <div className="space-y-2 text-slate-300 leading-relaxed font-sans">
            <p className="font-bold text-slate-100">MUTUAL NON-DISCLOSURE & PROPRIETARY RIGHTS AGREEMENT</p>
            <p>
              This Agreement is entered into by and between <strong>NextAura Technologies Inc.</strong> and the undersigned Party. Both parties agree to protect and keep strictly confidential all proprietary financial data, AI algorithms, and business strategy shared within the NextAura platform.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
            Document ID: {doc.id} • Hash: 0x88f92a9...c4021
          </div>
        </div>

        {/* Signature Pad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200">Draw or Type Your Signature</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSignatureType('draw')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  signatureType === 'draw' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draw Canvas
              </button>
              <button
                onClick={() => setSignatureType('type')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  signatureType === 'type' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Type Signature
              </button>
            </div>
          </div>

          {signatureType === 'draw' ? (
            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-2">
              <canvas
                ref={canvasRef}
                width={500}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-36 bg-slate-950 rounded-xl cursor-crosshair touch-none"
              />
              <button
                onClick={clearCanvas}
                className="absolute right-4 bottom-4 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-semibold"
              />
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center font-serif text-2xl italic text-teal-400 tracking-wider">
                {typedName || 'Your Signature'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleFinishSigning}
          disabled={isSigned}
          className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSigned ? 'Signature Captured!' : 'Adopt & Sign Document'}
        </button>
      </div>
    </div>
  );
};
