// File: frontend/app/privacy/page.tsx

"use client";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">

        {/* Header */}
        <header className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-neutral-500">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
          <p className="text-neutral-700 max-w-3xl">
            PredAI is built on a non-custodial architecture. You retain
            control of your wallet, assets, and private keys at all times.
            This policy explains what limited information we process and how
            it is handled.
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            1. Information We Collect
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Public wallet addresses connected to the platform</li>
            <li>Optional email address (if provided for notifications)</li>
            <li>Anonymous usage analytics (page views, feature usage)</li>
            <li>On-chain transaction metadata (public blockchain data)</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            2. Information We Do Not Collect
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Private keys or seed phrases</li>
            <li>Wallet passwords</li>
            <li>Custodial control of funds</li>
            <li>Biometric data</li>
            <li>KYC data (unless required in future regulatory updates)</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            3. How We Use Information
          </h2>
          <p className="text-neutral-700">
            Collected information is used strictly to:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Operate prediction markets and AI agents</li>
            <li>Improve product performance and reliability</li>
            <li>Provide optional notifications and updates</li>
            <li>Detect abuse or malicious behavior</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            4. Third-Party Services
          </h2>
          <p className="text-neutral-700">
            PredAI may use infrastructure providers for:
          </p>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Blockchain indexing and RPC services</li>
            <li>Analytics and telemetry</li>
            <li>Email notifications</li>
            <li>Fiat on-ramps (e.g., payment processors)</li>
          </ul>
          <p className="text-neutral-700">
            These providers may process limited metadata in accordance with
            their own privacy policies.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            5. Data Retention
          </h2>
          <p className="text-neutral-700">
            Public blockchain data cannot be deleted due to its decentralized
            nature. Off-chain analytics data is retained only as long as
            necessary for platform improvement and security.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            6. Security
          </h2>
          <p className="text-neutral-700">
            We implement industry-standard security practices, including
            encryption, access control, and infrastructure monitoring.
            However, users remain responsible for securing their own wallets.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            7. Your Rights
          </h2>
          <p className="text-neutral-700">
            Depending on your jurisdiction (EU, US, India, etc.), you may
            have rights related to data access and deletion. You may contact
            us to request information regarding data associated with your
            wallet address or email.
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-10 border-t text-sm text-neutral-500">
          PredAI is a non-custodial protocol interface. Users are solely
          responsible for their trading decisions and wallet security.
        </footer>

      </div>
    </main>
  );
}
