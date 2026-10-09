import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Edit3, Lock, AlertTriangle } from 'lucide-react';

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
      alert('Invalid JSON payload. Please fix syntax before authorizing.');
    }
  };

  return (
    <div style={{
      margin: '16px 0',
      background: 'linear-gradient(145deg, #181512 0%, #0d0f14 100%)',
      border: '1.5px solid #f59e0b',
      borderRadius: '16px',
      boxShadow: '0 12px 36px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Warning Banner Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.05) 100%)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            color: '#f59e0b'
          }}>
            <ShieldAlert style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>HUMAN-IN-THE-LOOP APPROVAL GATE</span>
              <span style={{
                fontSize: '10px',
                background: '#f59e0b',
                color: '#000',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '4px'
              }}>PAUSED</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Action Type: <strong style={{ color: '#fbbf24' }}>{actionType}</strong> • Execution halted before live mutation
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#38bdf8',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Edit3 style={{ width: 13, height: 13 }} />
          <span>{isEditing ? 'Cancel Edit' : 'Edit Payload'}</span>
        </button>
      </div>

      {/* Body Payload Section */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Drafted Action Parameters:
        </div>

        {isEditing ? (
          <textarea
            value={editedPayloadJson}
            onChange={(e) => setEditedPayloadJson(e.target.value)}
            style={{
              width: '100%',
              height: '140px',
              background: '#030712',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'JetBrains Mono, Menlo, monospace',
              fontSize: '12px',
              color: '#34d399',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <div style={{
            background: '#030712',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px'
          }}>
            {Object.entries(actionPayload).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{key}:</span>
                <span style={{ color: '#fde68a', fontWeight: 500 }}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Decision Buttons */}
      <div style={{
        background: '#0a0d14',
        borderTop: '1px solid #1e293b',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <Lock style={{ width: 12, height: 12 }} />
          <span>Requires Operator Authorization</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onReject}
            disabled={isLoading}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f43f5e',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <XCircle style={{ width: 15, height: 15 }} />
            <span>Reject & Cancel</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle style={{ width: 15, height: 15 }} />
            <span>{isLoading ? 'Authorizing...' : 'Approve & Execute'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
