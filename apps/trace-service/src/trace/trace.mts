/**
 * TraceStepKind - kinds of steps within an operation
 */
export type TraceStepKind = "if" | "operation" | "call" | "return" | "throw" | "note";

/**
 * TraceStep - represents a single step within an operation
 */
export interface TraceStep {
  /** Global step number (monotonic across entire trace tree) */
  step: number;

  /** Nesting depth (0 = root, 1+ = nested) */
  depth: number;

  /** Kind of step */
  kind: TraceStepKind;

  /** Human-readable hint or description */
  hint?: string;

  /** Detailed description */
  description?: string;

  /** Value representation (e.g., string representation of a computed value) */
  value?: string;

  /** Type name (e.g., "number", "string", "object") */
  type?: string;

  /** Input values as human-readable strings */
  inputs?: string[];

  /** Output value as human-readable string */
  output?: string;

  /** Error message if this step threw */
  error?: string;

  /** ECMA spec step order (1-based). When present, UI sorts by this value. */
  specOrder?: number;

  /** For if-kind steps: true = condition was met (taken), false = not taken (skipped). */
  taken?: boolean;
}



/**
 * TraceNode - represents an operation in the algorithm execution tree
 */
export interface TraceNode {
  /** Global step number where operation started */
  step: number;

  /** Nesting depth */
  depth: number;

  /** Algorithm identifier (e.g., "ToNumber", "ToPrimitive") */
  algoId: string;

  /** Input values for the operation */
  inputs: string[];

  /** Output value (set when operation completes) */
  output?: string;

  /** Error if operation threw */
  error?: string;

  /** Steps within this operation */
  steps: TraceStep[];

  /** Child operations (from nested algorithm calls) */
  children: TraceNode[];
}

/**
 * TraceRecord - hierarchical trace recorder for algorithm execution
 * Tracks nested operations as a tree with global step numbering
 */
export class TraceRecord {
  private roots: TraceNode[] = [];

  private stack: TraceNode[] = [];

  private stepCount: number = 0;

  /**
   * Get the next global step number
   */
  private getNextStep(): number {
    return ++this.stepCount;
  }

  /**
   * Get current depth based on stack
   */
  private getCurrentDepth(): number {
    return this.stack.length;
  }

  /**
   * Get the current operation (top of stack)
   */
  private getCurrentNode(): TraceNode | undefined {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Create a new operation node
   */
  private createNode(algoId: string, inputs: string[] = []): TraceNode {
    return {
      step: this.getNextStep(),
      depth: this.getCurrentDepth(),
      algoId,
      inputs,
      steps: [],
      children: [],
    };
  }

  /**
   * Push a new operation onto the stack
   * Attaches it to parent's children or roots
   */
  pushOperation(algoId: string, inputs: string[] = []): TraceNode {
    const node = this.createNode(algoId, inputs);
    const parent = this.getCurrentNode();

    if (parent) {
      parent.children.push(node);
    } else {
      this.roots.push(node);
    }

    this.stack.push(node);
    return node;
  }

  /**
   * Pop the current operation
   * Optionally set output before popping
   */
  popOperation(output?: string): TraceNode | undefined {
    const node = this.stack.pop();
    if (node && output !== undefined) {
      node.output = output;
    }
    return node;
  }

  /**
   * Add a step to the current operation
   * Auto-creates implicit root if no current operation exists
   */
  addStep(stepData: Omit<TraceStep, "step" | "depth">): TraceStep {
    let current = this.getCurrentNode();

    // Auto-create implicit root operation if none exists
    if (!current) {
      this.pushOperation("UnknownOperation", []);
      current = this.getCurrentNode()!;
    }

    const step: TraceStep = {
      step: this.getNextStep(),
      depth: this.getCurrentDepth(),
      kind: stepData.kind,
      hint: stepData.hint,
      description: stepData.description,
      value: stepData.value,
      type: stepData.type,
      inputs: stepData.inputs,
      output: stepData.output,
      error: stepData.error,
      specOrder: stepData.specOrder,
      taken: stepData.taken,
    };

    current.steps.push(step);

    return step;
  }

  /**
   * Backward compatibility: addEntry method (old API)
   * Adds a step to the current operation, or creates implicit root if needed
   */
  addEntry(
    stepData: { algoId?: string; kind?: string; value?: string; type?: string; hint?: string } & Record<
      string,
      unknown
    >,
    inputs?: string[],
    output?: string,
  ): TraceNode | TraceStep {
    // Handle as a step in current operation
    let current = this.getCurrentNode();

    if (!current) {
      // Auto-create implicit root if needed
      const algoId = (stepData.algoId as string) || (stepData.operation as string) || "UnknownOperation";
      this.pushOperation(algoId, inputs);
      current = this.getCurrentNode()!;
    }

    const step = this.addStep({
      kind: (stepData.kind as TraceStepKind) || "operation",
      hint: stepData.hint as string | undefined,
      description: stepData.description as string | undefined,
      value: stepData.value as string | undefined,
      type: stepData.type as string | undefined,
      inputs,
      output,
    });

    return step;
  }

  /**
   * Set error on current operation
   */
  setError(error: string): void {
    const current = this.getCurrentNode();
    if (current) {
      current.error = error;
    }
  }

  /**
   * Set output on current operation
   */
  setOutput(output: string): void {
    const current = this.getCurrentNode();
    if (current) {
      current.output = output;
    }
  }

  /**
   * Get all root operation nodes
   */
  getEntries(): readonly TraceNode[] {
    return this.roots;
  }

  /**
   * Get total step count
   */
  getStepCount(): number {
    return this.stepCount;
  }

  /**
   * Check if trace is empty
   */
  isEmpty(): boolean {
    return this.roots.length === 0;
  }

  /**
   * Clear all trace data and reset counters
   */
  clear(): void {
    this.roots = [];
    this.stack = [];
    this.stepCount = 0;
  }

  /**
   * Format trace tree as human-readable string
   */
  formatTree(): string {
    if (this.isEmpty()) {
      return "No trace data";
    }

    const lines: string[] = [];

    const renderNode = (node: TraceNode, prefix: string = "") => {
      // Format node header
      const inputStr = node.inputs.length > 0 ? `(${node.inputs.join(", ")})` : "()";
      const outputStr = node.output !== undefined ? ` → ${node.output}` : "";
      const errorStr = node.error ? ` [ERROR: ${node.error}]` : "";

      lines.push(`${prefix}Step ${node.step}@depth${node.depth}: ${node.algoId}${inputStr}${outputStr}${errorStr}`);

      // Render steps
      if (node.steps.length > 0) {
        node.steps.forEach((step, idx) => {
          const hasMore = idx < node.steps.length - 1 || node.children.length > 0;
          const stepPrefix = prefix + (hasMore ? "  ├─ " : "  └─ ");
          const hintStr = step.hint ? ` ${step.hint}` : "";
          const stepOutStr = step.output !== undefined ? ` → ${step.output}` : "";
          lines.push(`${stepPrefix}[${step.step}] ${step.kind}${stepOutStr}${hintStr}`);
        });
      }

      // Render children
      if (node.children.length > 0) {
        node.children.forEach((child, idx) => {
          const isLast = idx === node.children.length - 1;
          const childPrefix = prefix + (isLast ? "  └─ " : "  ├─ ");
          renderNode(child, childPrefix);
        });
      }
    };

    this.roots.forEach((root) => {
      renderNode(root);
    });

    return lines.join("\n");
  }

  /**
   * Get the root operations
   */
  getRoots(): TraceNode[] {
    return this.roots;
  }

  /**
   * Flatten all steps from the tree into a single array, preserving hierarchy info
   */
  getAllSteps(): TraceStep[] {
    const allSteps: TraceStep[] = [];

    const collectSteps = (node: TraceNode) => {
      allSteps.push(...node.steps);
      for (const child of node.children) {
        collectSteps(child);
      }
    };

    for (const root of this.roots) {
      collectSteps(root);
    }

    return allSteps;
  }

  /**
   * Get JSON representation
   */
  toJSON(): object {
    return {
      totalSteps: this.stepCount,
      roots: this.roots,
    };
  }
}

/**
 * TraceEntry - backward compatibility type alias
 * Maps to TraceNode for existing code that references this type
 */
export type TraceEntry = TraceNode;
