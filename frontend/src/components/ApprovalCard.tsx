import React, { useState } from 'react';
import { ShieldAlert, Check, X, Edit3, Lock } from 'lucide-react';

interface ApprovalCardProps {
  actionType?: string;
  actionPayload?: Record<string, any>;
  onApprove: (modifiedPayload?: Record<string, any>) => void;
  onReject: () => void;
  isLoading: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  actionType,
  actionPayload,
  onApprove,
  onReject,
  isLoading,
}) => {
  if (!actionPayload) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editedPayloadJson, setEditedPayloadJson] = useState(
    JSON.stringify(actionPayload, null, 2)
  );

  const handleApprove = () => {
    try {
      const parsed = isEditing ? JSON.parse(editedPayloadJson) : actionPayload;
      onApprove(parsed);
    } catch {
      alert('Invalid JSON format. Please correct it before approving.');
    }
  };

  return (
    <div className="approval-card">
      {/* Header */}
      <div className="approval-card-header">
        <div className="approval-header-info">
          <div className="approval-status-tag">Action Required</div>
          <span className="approval-action-title">{actionType || 'System Workflow Action'}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="approval-edit-toggle"
        >
          <Edit3 style={{ width: 12, height: 12 }} />
          <span>{isEditing ? 'Cancel Edit' : 'Edit Parameters'}</span>
        </button>
      </div>

      {/* Body */}
      <div className="approval-card-body">
        <div className="approval-section-label">Parameters</div>
        {isEditing ? (
          <textarea
            value={editedPayloadJson}
            onChange={(e) => setEditedPayloadJson(e.target.value)}
            className="approval-json-editor"
          />
        ) : (
          <div className="approval-params-list">
            {Object.entries(actionPayload).map(([key, value]) => (
              <div key={key} className="approval-param-row">
                <span className="approval-param-key">{key}</span>
                <span className="approval-param-val">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="approval-card-footer">
        <div className="approval-security-note">
          <Lock style={{ width: 12, height: 12 }} />
          <span>Requires Human Approval</span>
        </div>

        <div className="approval-btn-group">
          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="btn-reject"
          >
            <X style={{ width: 14, height: 14 }} />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isLoading}
            className="btn-approve"
          >
            <Check style={{ width: 14, height: 14 }} />
            <span>{isLoading ? 'Executing...' : 'Approve & Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
