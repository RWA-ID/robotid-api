import { Subscriber } from '../generated/schema';
import { Subscribed } from '../generated/Subscription/Subscription';

export function handleSubscribed(event: Subscribed): void {
  const id = event.params.subscriber.toHexString();
  let sub = Subscriber.load(id);
  if (sub == null) {
    sub = new Subscriber(id);
    sub.address = event.params.subscriber;
    sub.subscriptionCount = 0;
  }
  sub.tier = event.params.tier;
  sub.expiry = event.params.expiry;
  sub.subscriptionCount = sub.subscriptionCount + 1;
  sub.lastSubscribedAt = event.block.timestamp;
  sub.save();
}
