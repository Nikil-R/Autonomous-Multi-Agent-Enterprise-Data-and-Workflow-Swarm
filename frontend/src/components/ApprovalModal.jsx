import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Edit3 } from 'lucide-react';

export const ApprovalModal = ({
  isOpen,
  actionType,
  payload,
  onApprove,
  onReject,
  isSubmitting,
}) => {
  const [editedPayload, setEditedPayload] = React.useState(payload || {});

  React.useEffect(() => {
    setEditedPayload(payload || {});
  }, [payload]);

  if (!isOpen) return null;

  const handleFieldChange = (key, value) => {
    setEditedPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide">
              Human-in-the-Loop Approval Required
            </h3>
            <p className="text-xs text-slate-400">
              LangGraph Breakpoint Active · Action Gated: <span className="text-amber-400 font-mono font-medium">{actionType}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          The autonomous swarm prepared an operational action that modifies enterprise state. 
          In compliance with safety policy, please review or edit the parameters before authorizing execution.
        </p>

        {/* Editable Fields */}
        <div className="mt-4 space-y-3">
          {actionType === 'CREATE_TICKET' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-400">Ticket Title</label>
                <input
                  type="text"
                  value={editedPayload.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">Category</label>
                  <select
                    value={editedPayload.category || 'TECHNICAL'}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="BILLING">BILLING</option>
                    <option value="API_INTEGRATION">API_INTEGRATION</option>
                    <option value="SECURITY_ACCESS">SECURITY_ACCESS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Priority Level</label>
                  <select
                    value={editedPayload.priority || 'HIGH'}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none font-medium text-amber-300"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {actionType === 'DISPATCH_ALERT' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-400">Broadcast Channel</label>
                <input
                  type="text"
                  value={editedPayload.channel || '#incident-commander'}
                  onChange={(e) => handleFieldChange('channel', e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Alert Message Body</label>
                <textarea
                  rows={3}
                  value={editedPayload.message || ''}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Raw JSON Preview */}
        <div className="mt-4">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Payload Metadata Inspector
          </span>
          <pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-slate-950 p-2 text-[11px] font-mono text-emerald-400 border border-slate-800">
            {JSON.stringify(editedPayload, null, 2)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onReject}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-all"
          >
            <XCircle className="w-4 h-4" /> Reject Action
          </button>
          <button
            onClick={() => onApprove(editedPayload)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> {isSubmitting ? 'Resuming...' : 'Approve & Execute'}
          </button>
        </div>
      </div>
    </div>
  );
};
