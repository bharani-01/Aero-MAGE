import { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  requireTextMatch?: string; // Optional keyword user must type (e.g. "DELETE" or room code)
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  type = 'danger',
  requireTextMatch,
  onConfirm,
  onClose
}: ConfirmationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleNextStep = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (requireTextMatch && inputText.trim().toUpperCase() !== requireTextMatch.toUpperCase()) {
      setErrorMsg(`Please type "${requireTextMatch}" to confirm.`);
      return;
    }
    onConfirm();
    handleReset();
  };

  const handleReset = () => {
    setStep(1);
    setInputText('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-outline-variant/30 flex flex-col gap-6 animate-scale">
        
        {/* Header Icon */}
        <div className="flex justify-between items-start">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {type === 'danger' ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>

          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-red-600' : 'w-3 bg-slate-200'}`} />
          <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-red-600' : 'w-3 bg-slate-200'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-auto">
            Verification Step {step} of 2
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-2">{message}</p>
        </div>

        {/* Step 2 Extra Verification Input */}
        {step === 2 && requireTextMatch && (
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-red-900 uppercase tracking-wider">
              Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-700">{requireTextMatch}</span> below to confirm:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setErrorMsg(''); }}
              placeholder={`Type "${requireTextMatch}"`}
              className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {errorMsg && <span className="text-[11px] text-red-600 font-bold">{errorMsg}</span>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            {cancelText}
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <span>Continue</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmText}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
