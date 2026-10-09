import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Edit3 } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  actionType?: string;
  actionPayload?: Record<string, any>;
  onApprove: (modifiedPayload?: Record<string, any>) => void;
  onReject: () => void;
  isLoading: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  actionType,
  actionPayload,
  onApprove,
  onReject,
  isLoading,
}) => {
  if (!isOpen || !actionPayload) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedPayloadJson, setEditedPayloadJson] = useState(
    JSON.stringify(actionPayload, null, 2)
  );

  const handleApprove = () => {
    try {
      const parsed = isEditing ? JSON.parse(editedPayloadJson) : actionPayload;
      onApprove(parsed);
    } catch {
      alert('Invalid JSON payload. Please fix before approving.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-amber-500/30 p-5 flex items-start gap-4">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-amber-200 flex items-center gap-2">
              Human-in-the-Loop Authorization Required
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              The autonomous swarm proposed an operational action ({actionType}).
              Enterprise compliance requires manual review before execution.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Proposed Action Parameters
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Payload'}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={editedPayloadJson}
              onChange={(e) => setEditedPayloadJson(e.target.value)}
              className="w-full h-44 bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-amber-500/80 resize-none"
            />
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs font-mono text-slate-300">
              {Object.entries(actionPayload).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-slate-500 font-semibold">{key}:</span>
                  <span className="text-amber-300 font-medium">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 px-6 flex justify-end gap-3">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Reject & Cancel</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isLoading ? 'Authorizing...' : 'Approve & Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
