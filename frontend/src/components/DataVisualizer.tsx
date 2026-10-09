import React from 'react';
import { Database, Table, Hash } from 'lucide-react';

interface DataVisualizerProps {
  sqlQuery?: string;
  data?: Array<Record<string, any>>;
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ sqlQuery, data }) => {
  if (!sqlQuery && (!data || data.length === 0)) return null;

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="data-visualizer">
      {/* SQL Query Section */}
      {sqlQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="sql-badge-header">
            <Database style={{ width: 14, height: 14 }} />
            <span>EXECUTED & VERIFIED SQL QUERY</span>
          </div>
          <pre className="sql-code-block">
            {sqlQuery}
          </pre>
        </div>
      )}

      {/* Relational Data Table Preview */}
      {data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="table-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Table style={{ width: 14, height: 14, color: '#60a5fa' }} />
              <span>QUERY RESULTS ({data.length} ROWS)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
              <Hash style={{ width: 12, height: 12 }} />
              <span>Read-Only Verified</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {columns.map((col) => (
                      <td key={col}>
                        {typeof row[col] === 'number'
                          ? row[col].toLocaleString()
                          : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
