/**
 * Intent adapters. Each adapter classifies a platform-specific utterance into a
 * normalized intent: an action target (vendor/contract address), a value, and a
 * human-readable label the SDK hashes for IntentRouter.submitIntent.
 */

export type AdapterName = 'ros2-bridge' | 'alexa' | 'google-assistant' | 'custom-llm';

export interface ClassifiedIntent {
  /** normalized natural-language command (lowercased, single-spaced) */
  normalized: string;
  /** action target — vendor or contract the action pays/calls */
  actionTarget: `0x${string}`;
  /** value in wei (0 for non-payment actions) */
  value: bigint;
  /** ROS2 action goal (only for ros2-bridge) or adapter-specific payload */
  payload?: Record<string, unknown>;
}

export interface Adapter {
  name: AdapterName;
  classify(utterance: string, ctx: AdapterContext): Promise<ClassifiedIntent> | ClassifiedIntent;
}

export interface AdapterContext {
  /** default action target when the utterance doesn't name a vendor */
  defaultTarget?: `0x${string}`;
  /** map of keyword → vendor address (e.g. "dock b" → 0x...) */
  vendors?: Record<string, `0x${string}`>;
  /** optional custom LLM classifier (for the custom-llm adapter) */
  classifier?: (utterance: string) => Promise<ClassifiedIntent>;
}

const ZERO = '0x0000000000000000000000000000000000000000' as const;

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Resolve a vendor address by scanning the utterance for known keywords. */
function resolveTarget(normalized: string, ctx: AdapterContext): `0x${string}` {
  if (ctx.vendors) {
    for (const [kw, addr] of Object.entries(ctx.vendors)) {
      if (normalized.includes(kw.toLowerCase())) return addr;
    }
  }
  return ctx.defaultTarget ?? ZERO;
}

/** Very small heuristic value extractor: "0.5 eth", "pay 1 eth", etc. */
function extractValue(normalized: string): bigint {
  const m = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*eth/);
  if (!m) return 0n;
  const [whole, frac = ''] = m[1].split('.');
  const padded = (frac + '0'.repeat(18)).slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded || '0');
}

/**
 * Lead adapter — maps intents to ROS2 action goals. Most robot OEMs run ROS2,
 * so the classified intent carries a `ros2` payload (action server + goal) the
 * controller can dispatch once the on-chain authorization returns.
 */
export const ros2Bridge: Adapter = {
  name: 'ros2-bridge',
  classify(utterance, ctx) {
    const normalized = normalize(utterance);
    const actionTarget = resolveTarget(normalized, ctx);
    const value = extractValue(normalized);

    // naive verb → ROS2 action mapping
    let action = '/robot/execute_task';
    if (/charg|dock/.test(normalized)) action = '/robot/navigate_to_dock';
    else if (/pay|payment|invoice/.test(normalized)) action = '/robot/authorize_payment';
    else if (/inspect|scan|patrol/.test(normalized)) action = '/robot/start_inspection';

    return {
      normalized,
      actionTarget,
      value,
      payload: { ros2: { actionServer: action, goal: { utterance: normalized } } },
    };
  },
};

export const alexaAdapter: Adapter = {
  name: 'alexa',
  classify(utterance, ctx) {
    // Alexa passes resolved slots; here we treat the raw utterance text.
    const normalized = normalize(utterance);
    return { normalized, actionTarget: resolveTarget(normalized, ctx), value: extractValue(normalized) };
  },
};

export const googleAssistantAdapter: Adapter = {
  name: 'google-assistant',
  classify(utterance, ctx) {
    const normalized = normalize(utterance);
    return { normalized, actionTarget: resolveTarget(normalized, ctx), value: extractValue(normalized) };
  },
};

/** custom-llm — defer classification to a caller-provided LLM function. */
export const customLlmAdapter: Adapter = {
  name: 'custom-llm',
  async classify(utterance, ctx) {
    if (!ctx.classifier) throw new Error('custom-llm adapter requires ctx.classifier');
    return ctx.classifier(utterance);
  },
};

export const ADAPTERS: Record<AdapterName, Adapter> = {
  'ros2-bridge': ros2Bridge,
  alexa: alexaAdapter,
  'google-assistant': googleAssistantAdapter,
  'custom-llm': customLlmAdapter,
};
