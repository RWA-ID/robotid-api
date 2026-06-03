/**
 * @robot-id/intent-sdk — converts natural-language / AI agent commands into
 * on-chain actions via IntentRouter. Lead adapter: ros2-bridge.
 *
 * @example
 * import { RobotIntentPlugin } from '@robot-id/intent-sdk'
 * const plugin = new RobotIntentPlugin({
 *   robotId: 1n,
 *   apiKey: process.env.ROBOT_ID_KEY!,
 *   adapter: 'ros2-bridge',
 * })
 * const ack = await plugin.handleUtterance(
 *   "Authorize payment for charging dock B and log the task"
 * )
 */

import { RobotIdClient, type UnsignedTx, type Network } from '@robot-id/sdk';
import { ADAPTERS, type AdapterName, type AdapterContext, type ClassifiedIntent } from './adapters.js';

export * from './adapters.js';

export interface RobotIntentPluginOptions {
  robotId: bigint;
  apiKey: string;
  adapter?: AdapterName;
  network?: Network;
  baseUrl?: string;
  context?: AdapterContext;
}

export interface IntentAck {
  ok: boolean;
  intentHash: `0x${string}`;
  classified: ClassifiedIntent;
  /** unsigned IntentRouter.submitIntent tx — sign with the agent operator key */
  unsignedTx: UnsignedTx;
  /** ROS2 goal to dispatch once the tx is authorized on-chain (ros2-bridge) */
  ros2Goal?: Record<string, unknown>;
}

export class RobotIntentPlugin {
  private readonly client: RobotIdClient;
  private readonly robotId: bigint;
  private readonly adapterName: AdapterName;
  private readonly ctx: AdapterContext;
  private nonce = 0;

  constructor(opts: RobotIntentPluginOptions) {
    this.client = new RobotIdClient({
      apiKey: opts.apiKey,
      network: opts.network ?? 'mainnet',
      baseUrl: opts.baseUrl,
    });
    this.robotId = opts.robotId;
    this.adapterName = opts.adapter ?? 'ros2-bridge';
    this.ctx = opts.context ?? {};
  }

  /**
   * classify intent → check AgentWallet limits (server preflight) →
   * IntentRouter.submitIntent (returns unsigned tx) → return ack.
   */
  async handleUtterance(utterance: string): Promise<IntentAck> {
    const adapter = ADAPTERS[this.adapterName];
    const classified = await adapter.classify(utterance, this.ctx);

    const res = await this.client.intent.submit({
      robotId: this.robotId,
      command: classified.normalized,
      actionTarget: classified.actionTarget,
      value: classified.value.toString(),
      nonce: this.nonce++,
    });

    const ros2Goal = classified.payload?.ros2 as Record<string, unknown> | undefined;
    return {
      ok: true,
      intentHash: res.intentHash,
      classified,
      unsignedTx: res.unsignedTx,
      ros2Goal,
    };
  }
}
