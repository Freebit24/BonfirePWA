import Link from "next/link";

export default function CommunityGuidelinesPage() {
  return (
    <>
      {/* Minimal Header */}
      <header className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            aria-label="Go back to home"
          >
            ← Back
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-neutral-300 hover:text-white transition-colors"
            aria-label="Bonfire home"
          >
            Bonfire
          </Link>
        </div>
        <div className="mt-4 border-b border-white/10" />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <h1 className="text-3xl font-semibold mb-4">Community Guidelines</h1>

      <p className="text-sm text-neutral-400 mb-8">
        Last updated: December 26, 2025
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Bonfire is a community-driven platform built around events,
          collaboration, and meaningful interactions. These Community
          Guidelines exist to help create a safe, respectful, and welcoming
          environment for everyone.
        </p>

        <h2 className="text-xl font-semibold mt-10">Be Respectful</h2>
        <p>
          Treat others with respect. Harassment, hate speech, discrimination,
          threats, or personal attacks are not tolerated.
        </p>

        <h2 className="text-xl font-semibold mt-10">Be Authentic</h2>
        <p>
          Do not impersonate others, create misleading accounts, or provide
          false information. Represent yourself honestly.
        </p>

        <h2 className="text-xl font-semibold mt-10">No Harmful or Illegal Content</h2>
        <p>
          Do not post or promote content that is illegal, dangerous, abusive,
          sexually explicit, or harmful to others.
        </p>

        <h2 className="text-xl font-semibold mt-10">Event Integrity</h2>
        <p>
          Events listed on Bonfire should be genuine and accurately described.
          Do not use the platform to scam, mislead, or exploit users.
        </p>

        <h2 className="text-xl font-semibold mt-10">Respect Privacy</h2>
        <p>
          Do not share personal or sensitive information about others without
          their explicit consent.
        </p>

        <h2 className="text-xl font-semibold mt-10">No Spam or Abuse</h2>
        <p>
          Avoid spam, unsolicited promotions, repetitive content, or attempts
          to manipulate engagement or visibility.
        </p>

        <h2 className="text-xl font-semibold mt-10">Enforcement</h2>
        <p>
          We may remove content, restrict features, or suspend accounts that
          violate these guidelines or negatively impact the community.
          Repeated or severe violations may result in permanent removal.
        </p>

        <h2 className="text-xl font-semibold mt-10">Reporting</h2>
        <p>
          If you encounter content or behavior that violates these guidelines,
          please report it or contact us so we can take appropriate action.
        </p>

        <h2 className="text-xl font-semibold mt-10">Changes to These Guidelines</h2>
        <p>
          We may update these Community Guidelines from time to time. Continued
          use of Bonfire after changes are posted constitutes acceptance of the
          updated guidelines.
        </p>

        <h2 className="text-xl font-semibold mt-10">Contact Us</h2>
        <p>
          If you have questions or concerns about these guidelines, contact us
          at:
        </p>
        <p>
          <strong>Email:</strong> <a href="mailto:bonfireglobal@gmail.com">bonfireglobal@gmail.com</a>
        </p>
      </div>
      </main>
    </>
  );
}