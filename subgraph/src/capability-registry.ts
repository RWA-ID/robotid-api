import { Attestation } from '../generated/schema';
import { CapabilityAttested } from '../generated/CapabilityRegistry/CapabilityRegistry';

export function handleCapabilityAttested(event: CapabilityAttested): void {
  const att = new Attestation(event.params.attestationId.toString());
  att.attestationId = event.params.attestationId;
  att.robot = event.params.robotId;
  att.capabilityKey = event.params.capabilityKey;
  att.value = event.params.value;
  att.merkleRoot = event.params.merkleRoot;
  att.oem = event.params.oem;
  att.timestamp = event.block.timestamp;
  att.save();
}
