import {
  InterferenceGraph,
  LiveRange,
  RegisterAllocationResult,
  TACInstruction,
} from '../../types';

export class RegisterAllocator {
  /**
   * Graph Coloring Register Allocation (Chaitin-Briggs)
   */
  public static graphColoring(
    instructions: TACInstruction[],
    kRegisters: number = 4
  ): RegisterAllocationResult {
    const liveRanges = RegisterAllocator.computeLiveRanges(instructions);
    const varNames = Array.from(liveRanges.keys());

    // 1. Build Interference Graph
    const nodes = varNames;
    const edges: { u: string; v: string }[] = [];
    const adj = new Map<string, Set<string>>();

    for (const v of nodes) {
      adj.set(v, new Set());
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const u = nodes[i];
        const v = nodes[j];
        const rU = liveRanges.get(u)!;
        const rV = liveRanges.get(v)!;

        // Overlapping live ranges interfere
        if (Math.max(rU.start, rV.start) <= Math.min(rU.end, rV.end)) {
          edges.push({ u, v });
          adj.get(u)!.add(v);
          adj.get(v)!.add(u);
        }
      }
    }

    const interferenceGraph: InterferenceGraph = {
      nodes: nodes.map((name) => ({
        id: name,
        variable: name,
        degree: adj.get(name)!.size,
        color: undefined,
        spilled: false,
      })),
      edges,
    };

    // 2. Kempe Heuristic / Simplification Stack
    const stack: string[] = [];
    const activeNodes = new Set(nodes);
    const spilledVars: string[] = [];
    const currentDegrees = new Map<string, number>();

    for (const n of nodes) {
      currentDegrees.set(n, adj.get(n)!.size);
    }

    while (activeNodes.size > 0) {
      // Find node with degree < k
      let candidate: string | null = null;
      for (const n of activeNodes) {
        if ((currentDegrees.get(n) || 0) < kRegisters) {
          candidate = n;
          break;
        }
      }

      if (candidate) {
        stack.push(candidate);
        activeNodes.delete(candidate);
        for (const neighbor of adj.get(candidate) || []) {
          if (activeNodes.has(neighbor)) {
            currentDegrees.set(neighbor, (currentDegrees.get(neighbor) || 0) - 1);
          }
        }
      } else {
        // Potential Spill: Pick node with highest degree
        let maxDeg = -1;
        let spillCandidate: string | null = null;
        for (const n of activeNodes) {
          const deg = currentDegrees.get(n) || 0;
          if (deg > maxDeg) {
            maxDeg = deg;
            spillCandidate = n;
          }
        }

        if (spillCandidate) {
          stack.push(spillCandidate);
          activeNodes.delete(spillCandidate);
        }
      }
    }

    // 3. Selection / Coloring
    const registerNames = Array.from({ length: kRegisters }, (_, i) => `R${i}`);
    const assignment: Record<string, string> = {};

    while (stack.length > 0) {
      const v = stack.pop()!;
      const neighborColors = new Set<string>();

      for (const neighbor of adj.get(v) || []) {
        if (assignment[neighbor]) {
          neighborColors.add(assignment[neighbor]);
        }
      }

      // Pick first available register
      let assignedReg: string | null = null;
      for (const reg of registerNames) {
        if (!neighborColors.has(reg)) {
          assignedReg = reg;
          break;
        }
      }

      if (assignedReg) {
        assignment[v] = assignedReg;
        const gNode = interferenceGraph.nodes.find((n) => n.id === v);
        if (gNode) gNode.color = assignedReg;
      } else {
        // Actual Spill
        spilledVars.push(v);
        const gNode = interferenceGraph.nodes.find((n) => n.id === v);
        if (gNode) gNode.spilled = true;
      }
    }

    return {
      method: 'Graph Coloring (Chaitin-Briggs)',
      assignment,
      spilledVariables: spilledVars,
      interferenceGraph,
      liveRanges: Array.from(liveRanges.values()),
    };
  }

  /**
   * Linear Scan Register Allocation (Poletto & Sarkar)
   */
  public static linearScan(
    instructions: TACInstruction[],
    kRegisters: number = 4
  ): RegisterAllocationResult {
    const liveRanges = Array.from(RegisterAllocator.computeLiveRanges(instructions).values()).sort(
      (a, b) => a.start - b.start
    );

    const registerNames = Array.from({ length: kRegisters }, (_, i) => `R${i}`);
    const active: LiveRange[] = [];
    const assignment: Record<string, string> = {};
    const spilled: string[] = [];
    const freeRegisters = [...registerNames];

    for (const interval of liveRanges) {
      // Expire old intervals
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end < interval.start) {
          const expired = active.splice(i, 1)[0];
          const reg = assignment[expired.variable];
          if (reg) freeRegisters.push(reg);
        }
      }

      if (active.length === kRegisters) {
        // Spill interval that ends furthest
        const lastActive = active[active.length - 1];
        if (lastActive && lastActive.end > interval.end) {
          assignment[interval.variable] = assignment[lastActive.variable];
          spilled.push(lastActive.variable);
          delete assignment[lastActive.variable];
          active.splice(active.indexOf(lastActive), 1);
          active.push(interval);
          active.sort((a, b) => a.end - b.end);
        } else {
          spilled.push(interval.variable);
        }
      } else {
        const reg = freeRegisters.shift() || `R${active.length}`;
        assignment[interval.variable] = reg;
        active.push(interval);
        active.sort((a, b) => a.end - b.end);
      }
    }

    return {
      method: 'Linear Scan',
      assignment,
      spilledVariables: spilled,
      liveRanges,
    };
  }

  private static computeLiveRanges(instructions: TACInstruction[]): Map<string, LiveRange> {
    const ranges = new Map<string, LiveRange>();

    const record = (v: string, line: number) => {
      if (!v || /^[0-9]/.test(v) || v.startsWith('"') || v === 'true' || v === 'false') return;
      if (!ranges.has(v)) {
        ranges.set(v, { variable: v, start: line, end: line });
      } else {
        const r = ranges.get(v)!;
        r.start = Math.min(r.start, line);
        r.end = Math.max(r.end, line);
      }
    };

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)) {
        record(inst.result, i);
      }
      if (inst.arg1) record(inst.arg1, i);
      if (inst.arg2) record(inst.arg2, i);
    }

    return ranges;
  }
}
