export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-14">

        {/* -------------------------------- Header -------------------------------- */}
        <header className="space-y-6 border-b border-zinc-200 pb-10">
          <h1 className="text-4xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-zinc-500 max-w-3xl text-sm leading-relaxed">
            Effective Date: {new Date().getFullYear()}
          </p>
        </header>

        {/* -------------------------------- Introduction -------------------------------- */}
        <section className="space-y-4">
          <p className="text-zinc-700 leading-relaxed">
            PredAI is an experimental, non-custodial platform for
            decentralized prediction markets, AI agents, and
            algorithmic capital allocation.
          </p>
          <p className="text-zinc-700 leading-relaxed">
            By accessing or using the platform, you acknowledge that
            participation involves significant financial, technical,
            and regulatory risk. You agree to these Terms in full.
          </p>
        </section>

        {/* -------------------------------- Sections -------------------------------- */}
        <section className="space-y-8">

          <LegalSection
            title="1. No Financial Advice"
            content={
              <>
                <p>
                  Nothing on PredAI constitutes financial, legal,
                  tax, or investment advice. All information,
                  analytics, agent outputs, and market signals
                  are provided for informational purposes only.
                </p>
                <p>
                  You are solely responsible for evaluating
                  risks and making independent decisions.
                </p>
              </>
            }
          />

          <LegalSection
            title="2. User Responsibility"
            content={
              <>
                <p>
                  You are solely responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Creating or interacting with markets</li>
                  <li>Staking or deploying digital assets</li>
                  <li>Using AI agents or automated strategies</li>
                  <li>Complying with applicable local laws</li>
                </ul>
                <p>
                  Losses may occur due to market volatility,
                  oracle outcomes, smart contract risks,
                  liquidity constraints, or software bugs.
                </p>
              </>
            }
          />

          <LegalSection
            title="3. Platform Rights"
            content={
              <>
                <p>
                  PredAI reserves the right to review, approve,
                  reject, suspend, or remove any market, agent,
                  or account at its sole discretion.
                </p>
                <p>
                  This includes actions taken to maintain
                  platform integrity, prevent abuse, or comply
                  with regulatory requirements.
                </p>
              </>
            }
          />

          <LegalSection
            title="4. Non-Custodial Nature"
            content={
              <>
                <p>
                  PredAI does not custody user funds.
                  You interact directly with smart contracts
                  using your own wallet.
                </p>
                <p>
                  You are responsible for safeguarding
                  your private keys and wallet access.
                </p>
              </>
            }
          />

          <LegalSection
            title="5. Experimental Software"
            content={
              <>
                <p>
                  The platform is provided “as is” without
                  warranties of any kind, express or implied.
                </p>
                <p>
                  Downtime, software defects, oracle delays,
                  and unexpected behaviors may occur.
                </p>
              </>
            }
          />

          <LegalSection
            title="6. Limitation of Liability"
            content={
              <>
                <p>
                  To the maximum extent permitted by law,
                  PredAI and its contributors shall not be
                  liable for any direct, indirect, incidental,
                  or consequential damages arising from use
                  of the platform.
                </p>
              </>
            }
          />

        </section>

        {/* -------------------------------- Footer -------------------------------- */}
        <footer className="pt-10 border-t border-zinc-200 text-xs text-zinc-500 leading-relaxed">
          By continuing to use PredAI, you confirm that you
          understand and accept these Terms of Service.
        </footer>

      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable Legal Section Component                                   */
/* ------------------------------------------------------------------ */

function LegalSection({
  title,
  content,
}: {
  title: string;
  content: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="text-zinc-700 text-sm leading-relaxed space-y-4">
        {content}
      </div>
    </div>
  );
}
