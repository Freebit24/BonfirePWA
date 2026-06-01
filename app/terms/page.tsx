import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <>
      {/* Minimal Header (matched with privacy page) */}
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
      <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>

      <p className="text-sm text-neutral-400 mb-8">
        Last updated: December 26, 2025
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          These Terms of Service govern your access to and use of Bonfire. By
          accessing or using the Service, you agree to be bound by these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-10">Use of the Service</h2>
        <p>
          You agree to use the Service only for lawful purposes and in
          accordance with these Terms. You are responsible for all activity
          that occurs under your account.
        </p>

        <h2 className="text-xl font-semibold mt-10">User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activities that occur under your
          account.
        </p>

        <h2 className="text-xl font-semibold mt-10">User Content</h2>
        <p>
          You retain ownership of any content you submit to the Service. By
          submitting content, you grant Bonfire a non-exclusive license to
          use, display, and distribute such content in connection with the
          Service.
        </p>

        <h2 className="text-xl font-semibold mt-10">Prohibited Conduct</h2>
        <p>
          You agree not to misuse the Service, interfere with its operation,
          or attempt to gain unauthorized access to any systems or data.
        </p>

        <h2 className="text-xl font-semibold mt-10">Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time
          if you violate these Terms or use the Service in a harmful manner.
        </p>

        <h2 className="text-xl font-semibold mt-10">
          Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Bonfire shall not be liable
          for any indirect, incidental, or consequential damages arising from
          your use of the Service.
        </p>

        <h2 className="text-xl font-semibold mt-10">Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          Service after changes become effective constitutes acceptance of
          the updated Terms.
        </p>

        <h2 className="text-xl font-semibold mt-10">Contact Us</h2>
        <p>
          If you have any questions about these Terms, contact us at:
        </p>
        <p>
          <strong>Email:</strong> <a href="mailto:bonfireglobal@gmail.com">bonfireglobal@gmail.com</a>
        </p>
      </div>
      </main>
    </>
  );
}