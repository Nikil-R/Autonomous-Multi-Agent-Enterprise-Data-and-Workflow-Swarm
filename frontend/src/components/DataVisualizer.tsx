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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 my-3 space-y-3 text-slate-100 shadow-md">
      {/* SQL Query Section */}
      {sqlQuery && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Database className="w-3.5 h-3.5" />
            <span>EXECUTED & VERIFIED SQL QUERY</span>
          </div>
          <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-emerald-950">
            {sqlQuery}
          </pre>
        </div>
      )}

      {/* Relational Data Table Preview */}
      {data && data.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-blue-400" />
              <span>QUERY RESULTS ({data.length} ROWS)</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Hash className="w-3 h-3" />
              <span>Read-Only Verified</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-56 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-2.5 font-medium text-slate-300 capitalize">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-850 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="p-2.5 text-slate-200">
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
