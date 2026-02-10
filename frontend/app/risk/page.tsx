export default function RiskDisclosurePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Risk Disclosure</h1>

      <p>
        Participation in prediction markets involves significant risk.
        You may lose part or all of your staked assets.
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Markets may resolve unexpectedly</li>
        <li>Oracles may be delayed or disputed</li>
        <li>Liquidity may be insufficient</li>
        <li>Smart contracts may contain bugs</li>
      </ul>

      <p>
        Only participate if you understand and accept these risks.
      </p>
    </main>
  );
}
