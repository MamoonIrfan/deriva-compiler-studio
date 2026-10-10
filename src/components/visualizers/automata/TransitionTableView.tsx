import React from 'react';
import { GraphNode } from './AutomatonGraph';

interface TransitionTableViewProps {
  type: 'NFA' | 'DFA' | 'MIN_DFA';
  nodes: GraphNode[];
  alphabet: string[];
  transitions: { from: number; char: string; to: number }[];
  activeStateId?: number | null;
  activeSymbol?: string | null;
  selectedStateId?: number | null;
  onSelectState?: (stateId: number) => void;
}

export const TransitionTableView: React.FC<TransitionTableViewProps> = ({
  type,
  nodes,
  alphabet,
  transitions,
  activeStateId,
  activeSymbol,
  selectedStateId,
  onSelectState,
}) => {
  // Build lookup table: [stateId][symbol] = array of target IDs
  const table = React.useMemo(() => {
    const map = new Map<number, Map<string, number[]>>();
    nodes.forEach((n) => {
      map.set(n.id, new Map());
    });

    transitions.forEach((t) => {
      const fromMap = map.get(t.from);
      if (fromMap) {
        if (!fromMap.has(t.char)) {
          fromMap.set(t.char, []);
        }
        if (!fromMap.get(t.char)!.includes(t.to)) {
          fromMap.get(t.char)!.push(t.to);
        }
      }
    });

    return map;
  }, [nodes, transitions]);

  // For NFA include ε column
  const displayAlphabet = React.useMemo(() => {
    if (type === 'NFA') {
      const hasEps = transitions.some((t) => t.char === 'ε');
      const filtered = alphabet.filter((a) => a !== 'ε');
      return hasEps ? [...filtered, 'ε'] : filtered;
    }
    return alphabet;
  }, [type, alphabet, transitions]);

  const prefix = type === 'NFA' ? 'S' : type === 'MIN_DFA' ? 'M' : 'D';

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-700/70 bg-slate-900/90 shadow-md scrollbar-thin">
      <table className="w-full min-w-[480px] text-left text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300">
            <th className="py-2.5 px-3 font-semibold text-slate-400 w-28">State</th>
            {displayAlphabet.map((symbol) => (
              <th
                key={symbol}
                className={`py-2.5 px-3 font-semibold text-center border-l border-slate-700/60 ${
                  activeSymbol === symbol ? 'bg-cyan-900/40 text-cyan-300' : ''
                }`}
              >
                {symbol === 'ε' ? 'ε (Epsilon)' : symbol}
              </th>
            ))}
            <th className="py-2.5 px-3 font-semibold text-slate-400 border-l border-slate-700/60">
              Type / Underlying Set
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {nodes.map((node) => {
            const isRowActive = activeStateId === node.id;
            const isRowSelected = selectedStateId === node.id;
            const stateTransitions = table.get(node.id) || new Map<string, number[]>();

            return (
              <tr
                key={node.id}
                onClick={() => onSelectState && onSelectState(node.id)}
                className={`cursor-pointer transition-colors duration-150 ${
                  isRowSelected
                    ? 'bg-amber-950/40 hover:bg-amber-950/50'
                    : isRowActive
                    ? 'bg-cyan-950/40 hover:bg-cyan-950/50'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                {/* State Label with Start (→) and Accept (*) textbook notations */}
                <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {node.isStart && (
                      <span className="text-blue-400 font-bold" title="Start State">
                        →
                      </span>
                    )}
                    {node.isAccept && (
                      <span className="text-emerald-400 font-bold" title="Accepting State">
                        *
                      </span>
                    )}
                    <span
                      className={`${
                        node.isAccept
                          ? 'text-emerald-400 font-bold'
                          : isRowActive
                          ? 'text-cyan-300 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      {node.label}
                    </span>
                  </div>
                </td>

                {/* Transition Cells */}
                {displayAlphabet.map((symbol) => {
                  const targets = stateTransitions.get(symbol) || [];
                  const isCellActive = isRowActive && activeSymbol === symbol;

                  return (
                    <td
                      key={symbol}
                      className={`py-2 px-3 text-center border-l border-slate-800 font-mono ${
                        isCellActive
                          ? 'bg-cyan-900/60 text-cyan-200 font-bold'
                          : targets.length > 0
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {targets.length === 0 ? (
                        '—'
                      ) : (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {targets.map((targetId) => {
                            const targetNode = nodes.find((n) => n.id === targetId);
                            const targetLabel = targetNode ? targetNode.label : `${prefix}${targetId}`;
                            return (
                              <span
                                key={targetId}
                                className={`px-1.5 py-0.5 rounded text-[11px] ${
                                  isCellActive
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                                }`}
                              >
                                {targetLabel}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Description / Details */}
                <td className="py-2 px-3 text-slate-400 border-l border-slate-800 text-[11px]">
                  <div className="flex items-center gap-2">
                    {node.isStart && (
                      <span className="bg-blue-950/80 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/60 text-[10px]">
                        Start
                      </span>
                    )}
                    {node.isAccept && (
                      <span className="bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60 text-[10px]">
                        Accepting
                      </span>
                    )}
                    {node.sublabel && (
                      <span className="text-slate-400 truncate max-w-xs">{node.sublabel}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
