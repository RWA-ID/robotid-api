import { Intent } from '../generated/schema';
import { IntentExecuted, IntentRejected } from '../generated/IntentRouter/IntentRouter';

export function handleIntentExecuted(event: IntentExecuted): void {
  const intent = new Intent(event.params.intentId.toString());
  intent.intentId = event.params.intentId;
  intent.robot = event.params.robotId;
  intent.intentHash = event.params.intentHash;
  intent.actionTarget = event.params.actionTarget;
  intent.value = event.params.value;
  intent.submitter = event.params.submitter;
  intent.authorized = true;
  intent.timestamp = event.block.timestamp;
  intent.save();
}

export function handleIntentRejected(event: IntentRejected): void {
  const intent = new Intent(event.params.intentId.toString());
  intent.intentId = event.params.intentId;
  intent.robot = event.params.robotId;
  intent.intentHash = event.params.intentHash;
  intent.authorized = false;
  intent.rejectReason = event.params.reason;
  intent.timestamp = event.block.timestamp;
  intent.save();
}
