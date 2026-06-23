'use client';

import { useEffect, useState } from 'react';
import { Reveal, SecHead } from './Reveal';

// streaming intent-log entries (signature animation)
const INTENT_LOG: [string, 'ok' | 'rej', string, string, string, string][] = [
  ['12:04:01', 'ok', 'EXECUTED', '/robot/navigate_to_dock', '“go charge at dock B”', '0 ETH'],
  ['12:04:09', 'ok', 'EXECUTED', '/robot/authorize_payment', 'vendor 0x9f…a1', '0.05 ETH'],
  ['12:04:15', 'rej', 'REJECTED', 'LimitsExceeded', '8.0 ETH > per-action ceiling', ''],
  ['12:04:22', 'rej', 'REJECTED', 'RateLimited', 'intent flood guard', ''],
  ['12:04:30', 'ok', 'EXECUTED', '/robot/start_inspection', '“patrol warehouse-01”', '0 ETH'],
  ['12:04:38', 'ok', 'EXECUTED', '/robot/return_to_base', 'task queue empty', '0 ETH'],
  ['12:04:44', 'rej', 'REJECTED', 'VendorNotAllowed', '0x3c…7e not on allowlist', ''],
];

export function IntentConsole() {
  const [count, setCount] = useState(INTENT_LOG.length);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 1;
    setCount(1);
    const id = setInterval(() => {
      i += 1;
      if (i > INTENT_LOG.length) { i = 1; setCount(1); }
      else setCount(i);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const shown = INTENT_LOG.slice(0, count);

  return (
    <section className="section blueprint" id="intent">
      <div className="wrap">
        <SecHead num="§ 05" tag="Live audit log" h="ROS2 intent, authorized on-chain.">
          Most robot OEMs run ROS2, so the lead adapter is <b className="sig">ros2-bridge</b>. Every
          command is classified, checked against the robot&rsquo;s AgentWallet limits, routed to a ROS2
          action goal, and recorded as an immutable audit entry — executed or rejected, with the reason.
        </SecHead>
        <Reveal as="div" className="console-wrap">
          <aside className="console-rail">
            <div className="rl">ROS2 node graph</div>
            <div className="node"><span className="led led-ok" />/intent_listener</div>
            <div className="node" style={{ marginLeft: 3 }}><span className="wire" /></div>
            <div className="node"><span className="led led-sig" />/agent_wallet_guard</div>
            <div className="node" style={{ marginLeft: 3 }}><span className="wire" /></div>
            <div className="node"><span className="led led-ok" />/action_dispatch</div>
            <div className="gauge">
              <div className="grow"><span>spend / 24h</span><span>1.42 / 4.0 ETH</span></div>
              <div className="gbar"><i style={{ width: '35%' }} /></div>
              <div className="grow" style={{ marginTop: 12 }}><span>rate</span><span>312 / 1000·min</span></div>
              <div className="gbar"><i style={{ width: '31%' }} /></div>
            </div>
          </aside>
          <div className="console">
            <div className="chead">
              <span>IntentRouter · boston-dynamics.robot-id.eth</span>
              <span className="dots"><i /><i /><i /></span>
            </div>
            <div className="log">
              {shown.map((r, idx) => (
                <div className={`lrow${idx === shown.length - 1 ? ' fresh' : ''}`} key={idx}>
                  <span className="t">{r[0]}</span>
                  <span className={`st ${r[1]}`}>{r[1] === 'ok' ? '✓' : '✗'} {r[2]}</span>
                  <span className="msg">
                    <b>{r[3]}</b>
                    {r[4] ? ` · ${r[4]}` : ''}
                    {r[5] ? ` · ${r[5]}` : ''}
                  </span>
                </div>
              ))}
              <span className="cursor" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
