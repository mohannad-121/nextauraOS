import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sliders } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';

export const FundingDilutionSimulator: React.FC = () => {
  const [preMoneyValuation, setPreMoneyValuation] = useState<number>(10000000); // $10M
  const [newInvestment, setNewInvestment] = useState<number>(2500000); // $2.5M
  const [esopExpansion, setEsopExpansion] = useState<number>(5); // 5%

  const postMoneyValuation = preMoneyValuation + newInvestment;
  const newInvestorOwnership = (newInvestment / postMoneyValuation) * 100;
  
  // Existing cap table initial weights: Founder 1 (45%), Founder 2 (25%), Series A (18%), ESOP (12%)
  const founder1After = 45 * (1 - newInvestorOwnership / 100) * (1 - esopExpansion / 100);
  const founder2After = 25 * (1 - newInvestorOwnership / 100) * (1 - esopExpansion / 100);
  const existingInvestorAfter = 18 * (1 - newInvestorOwnership / 100) * (1 - esopExpansion / 100);
  const esopAfter = 12 * (1 - newInvestorOwnership / 100) + esopExpansion;

  const chartData = [
    { name: 'Mohannad (Founder 1)', value: Number(founder1After.toFixed(1)), color: '#38bdf8' },
    { name: 'Moayad (Founder 2)', value: Number(founder2After.toFixed(1)), color: '#818cf8' },
    { name: 'New Round Investor', value: Number(newInvestorOwnership.toFixed(1)), color: '#f59e0b' },
    { name: 'Existing Series A', value: Number(existingInvestorAfter.toFixed(1)), color: '#34d399' },
    { name: 'ESOP Pool', value: Number(esopAfter.toFixed(1)), color: '#2dd4bf' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Funding Round & Dilution Simulator"
        subtitle="Model new venture investments, pre/post-money valuation, and founder dilution without altering production cap table."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sliders Input Panel */}
        <div className="lg:col-span-6 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">Simulation Inputs</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
              SIMULATOR MODE
            </span>
          </div>

          <div className="space-y-5 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-slate-400">Pre-Money Valuation</span>
                <span className="text-amber-400 text-sm font-mono">${(preMoneyValuation / 1000000).toFixed(1)}M</span>
              </div>
              <input
                type="range"
                min={5000000}
                max={30000000}
                step={500000}
                value={preMoneyValuation}
                onChange={(e) => setPreMoneyValuation(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-slate-400">New Investment Amount</span>
                <span className="text-amber-400 text-sm font-mono">${(newInvestment / 1000000).toFixed(1)}M</span>
              </div>
              <input
                type="range"
                min={500000}
                max={10000000}
                step={250000}
                value={newInvestment}
                onChange={(e) => setNewInvestment(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-slate-400">Option Pool (ESOP) Refresh</span>
                <span className="text-amber-400 text-sm font-mono">{esopExpansion}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={esopExpansion}
                onChange={(e) => setEsopExpansion(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Post-Money Valuation</span>
              <span className="text-base font-black text-slate-100 font-mono">${(postMoneyValuation / 1000000).toFixed(2)}M</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-medium">New Investor Stake</span>
              <span className="text-base font-black text-amber-400 font-mono">{newInvestorOwnership.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Ownership Visualizer Pie Chart */}
        <div className="lg:col-span-6 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 font-heading">Post-Round Ownership Structure</h3>
            <p className="text-xs text-slate-400 mt-1">Simulated share distribution after investment round.</p>

            <div className="h-60 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(value: any) => [`${value}%`, 'Ownership']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-4 border-t border-slate-800">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-100">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
