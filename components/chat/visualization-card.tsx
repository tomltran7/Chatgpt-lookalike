"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type VisualizationCardProps = {
  title?: string;
  id: string;
  chartData: any[];
  chartType: 'line' | 'bar' | 'table';
  sql?: string;
};

const VisualizationCard: React.FC<VisualizationCardProps> = ({ 
  title, 
  id, 
  chartData, 
  chartType,
  sql 
}) => {
  const [showSQL, setShowSQL] = React.useState(false);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: <span className="font-semibold">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div className="text-gray-500">No data available</div>;
    }

    const keys = Object.keys(chartData[0]);
    const xKey = keys[0];
    const yKeys = keys.slice(1).filter(k => typeof chartData[0][k] === 'number');
    
    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {yKeys.map((key, idx) => (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={colors[idx % colors.length]} 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {yKeys.map((key, idx) => (
              <Bar 
                key={key}
                dataKey={key} 
                fill={colors[idx % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Table view
    return (
      <div className="overflow-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {keys.map(key => (
                <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chartData.map((row, idx) => (
              <tr key={idx}>
                {keys.map(key => (
                  <td key={key} className="px-4 py-2 text-sm text-gray-900">
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title || 'Query Results'}</h3>
        {sql && (
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="text-xs text-purple-600 hover:text-purple-700 mt-1"
          >
            {showSQL ? 'Hide SQL' : 'Show SQL'}
          </button>
        )}
      </div>
      
      {showSQL && sql && (
        <pre className="mb-4 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-auto">
          {sql}
        </pre>
      )}
      
      {renderChart()}
    </div>
  );
};

export default VisualizationCard;
