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
    <div className="modal-backdrop">
      <div className="modal-dialog">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-icon">
            <ShieldAlert style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3 className="modal-title">
              Human-in-the-Loop Authorization Required
            </h3>
            <p className="modal-subtitle">
              The autonomous swarm proposed an operational action ({actionType}).
              Enterprise compliance requires manual review before execution.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          <div className="modal-actions-bar">
            <span>PROPOSED ACTION PARAMETERS</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="edit-btn"
            >
              <Edit3 style={{ width: 14, height: 14 }} />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Payload'}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={editedPayloadJson}
              onChange={(e) => setEditedPayloadJson(e.target.value)}
              className="payload-editor"
            />
          ) : (
            <div className="payload-preview">
              {Object.entries(actionPayload).map(([key, value]) => (
                <div key={key} className="payload-row">
                  <span className="payload-key">{key}:</span>
                  <span className="payload-value">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="btn-reject"
          >
            <XCircle style={{ width: 16, height: 16, color: '#f43f5e' }} />
            <span>Reject & Cancel</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="btn-approve"
          >
            <CheckCircle style={{ width: 16, height: 16 }} />
            <span>{isLoading ? 'Authorizing...' : 'Approve & Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
