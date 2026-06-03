import { Robot } from '../generated/schema';
import {
  RobotRegistered,
  RobotClaimed,
  Transfer,
} from '../generated/RobotIdentity/RobotIdentity';

export function handleRobotRegistered(event: RobotRegistered): void {
  const id = event.params.tokenId.toString();
  const robot = new Robot(id);
  robot.tokenId = event.params.tokenId;
  robot.serialHash = event.params.serialHash;
  robot.manufacturer = event.params.manufacturer;
  robot.model = event.params.model;
  robot.owner = event.params.owner;
  robot.locked = event.params.locked;
  robot.registeredAt = event.block.timestamp;
  robot.save();
}

export function handleRobotClaimed(event: RobotClaimed): void {
  const id = event.params.tokenId.toString();
  let robot = Robot.load(id);
  if (robot == null) {
    robot = new Robot(id);
    robot.tokenId = event.params.tokenId;
    robot.serialHash = event.params.serialHash;
    robot.manufacturer = '';
    robot.model = '';
    robot.locked = false;
    robot.registeredAt = event.block.timestamp;
  }
  robot.owner = event.params.owner;
  robot.claimedFromBatch = event.params.batchId;
  robot.save();
}

export function handleTransfer(event: Transfer): void {
  const id = event.params.tokenId.toString();
  const robot = Robot.load(id);
  if (robot != null) {
    robot.owner = event.params.to;
    robot.save();
  }
}
