import React from 'react';
import { Lightbulb, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Insight } from '../types';

interface InsightsWidgetProps {
  insights: Insight[];
}

const InsightsWidget: React.FC<InsightsWidgetProps> = ({ insights }) => {
  return (
    <div className="bg-[#0F172A] rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-white">
          <Lightbulb className="text-yellow-400" fill="currentColor" size={20} />
          Insights & <br /> Recomendações
        </h3>

        <div className="space-y-6">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="mt-1">
                {insight.type === 'success' && <CheckCircle2 className="text-green-400" size={20} />}
                {insight.type === 'warning' && <AlertTriangle className="text-yellow-400" size={20} />}
                {insight.type === 'info' && <Lightbulb className="text-blue-400" size={20} />}
              </div>
              <div>
                <h4 className={`font-bold text-sm mb-1 ${insight.type === 'success' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>{insight.title}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative Gradient Blob */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default InsightsWidget;
