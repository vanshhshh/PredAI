export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>

      <p>
        PredAI values your privacy. We collect minimal data required to
        operate the platform.
      </p>

      <h2 className="text-xl font-semibold">What We Collect</h2>
      <ul className="list-disc pl-6">
        <li>Wallet addresses</li>
        <li>Email addresses (if provided)</li>
        <li>Usage analytics (anonymous)</li>
      </ul>

      <h2 className="text-xl font-semibold">What We Do Not Collect</h2>
      <ul className="list-disc pl-6">
        <li>Private keys</li>
        <li>Passwords</li>
        <li>KYC data (currently)</li>
      </ul>

      <h2 className="text-xl font-semibold">Third-Party Services</h2>
      <p>
        We use services such as analytics, email delivery, and blockchain
        infrastructure providers. These services may collect metadata.
      </p>
    </main>
  );
}
