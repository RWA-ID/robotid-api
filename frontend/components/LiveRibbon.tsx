'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { CONTRACTS } from '@/lib/config';
import { ROBOT_IDENTITY_ABI } from '@/lib/contracts';

// Etherscan-style live metrics, read straight from chain (no backend).
export function LiveRibbon() {
  const [minted, setMinted] = useState<string>('—');

  useEffect(() => {
    const identity = CONTRACTS.robotIdentity;
    if (!identity || /^0x0+$/.test(identity)) return;
    const client = createPublicClient({ chain: mainnet, transport: http() });
    client
      .readContract({
        address: identity as `0x${string}`,
        abi: ROBOT_IDENTITY_ABI,
        functionName: 'totalMinted',
      })
      .then((n) => setMinted(n.toString()))
      .catch(() => setMinted('—'));
  }, []);

  return (
    <div className="ribbon">
      <div>
        <div className="n">{minted}</div>
        <div className="k">Robots on-chain</div>
      </div>
      <div>
        <div className="n">6</div>
        <div className="k">Verified contracts</div>
      </div>
      <div>
        <div className="n">3</div>
        <div className="k">Subscription tiers</div>
      </div>
      <div>
        <div className="n">∞</div>
        <div className="k">OEMs supported</div>
      </div>
    </div>
  );
}
