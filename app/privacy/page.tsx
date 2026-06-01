import Link from "next/link";

export default function PrivacyPolicyPage() {
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
      <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>

      <p className="text-sm text-neutral-400 mb-8">
        Last updated: December 26, 2025
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          This Privacy Policy describes Our policies and procedures on the
          collection, use, and disclosure of Your information when You use the
          Service and tells You about Your privacy rights and how the law
          protects You.
        </p>

        <p>
          Bonfire is an event discovery and community platform that allows users
          to create, discover, and participate in events.
        </p>

        <p>
          We use Your Personal Data to provide and improve the Service. By using
          the Service, You agree to the collection and use of information in
          accordance with this Privacy Policy.
        </p>

        <h2 className="text-xl font-semibold mt-10">
          Interpretation and Definitions
        </h2>

        <h3 className="font-semibold mt-4">Interpretation</h3>
        <p>
          The words whose initial letters are capitalized have meanings defined
          under the following conditions. The following definitions shall have
          the same meaning regardless of whether they appear in singular or in
          plural.
        </p>

        <h3 className="font-semibold mt-4">Definitions</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account</strong> means a unique account created for You to
            access our Service or parts of our Service.
          </li>
          <li>
            <strong>Company</strong> refers to Bonfire.
          </li>
          <li>
            <strong>Cookies</strong> are small files placed on Your device to
            store browsing-related information.
          </li>
          <li>
            <strong>Country</strong> refers to: India.
          </li>
          <li>
            <strong>Device</strong> means any device that can access the Service.
          </li>
          <li>
            <strong>Personal Data</strong> is any information that relates to an
            identified or identifiable individual.
          </li>
          <li>
            <strong>Service</strong> refers to the Website.
          </li>
          <li>
            <strong>Service Provider</strong> means any third party that
            processes data on behalf of the Company.
          </li>
          <li>
            <strong>Usage Data</strong> refers to data collected automatically
            when using the Service.
          </li>
          <li>
            <strong>Website</strong> refers to Bonfire, accessible from{" "}
            <a
              href="https://bonfire-web.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              https://bonfire-web.netlify.app/
            </a>
          </li>
          <li>
            <strong>You</strong> means the individual accessing or using the
            Service.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-10">
          Collecting and Using Your Personal Data
        </h2>

        <h3 className="font-semibold mt-4">Types of Data Collected</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email address</li>
          <li>First name and last name</li>
          <li>Phone number</li>
          <li>Usage Data</li>
        </ul>

        <h3 className="font-semibold mt-4">Usage Data</h3>
        <p>
          Usage Data is collected automatically and may include information such
          as IP address, browser type, pages visited, time spent on pages, and
          device identifiers.
        </p>

        <h3 className="font-semibold mt-4">
          Tracking Technologies and Cookies
        </h3>
        <p>
          We use cookies and similar technologies to enable essential
          functionality and improve the user experience. You can control or
          disable cookies through your browser settings.
        </p>

        <h3 className="font-semibold mt-4">Use of Your Personal Data</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide and maintain the Service</li>
          <li>To manage Your Account</li>
          <li>
            To contact You with service-related updates and important
            information
          </li>
          <li>To manage Your requests</li>
          <li>To improve the Service and user experience</li>
        </ul>

        <h3 className="font-semibold mt-4">
          Detailed Information on Data Processing
        </h3>
        <ul className="list-disc pl-6 space-y-4">
          <li>
            <strong>Google Places</strong>
            <p>
              Google Places is used to provide location-based features. Google
              may collect information in accordance with its Privacy Policy:
              <br />
              <a
                href="https://www.google.com/policies/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                https://www.google.com/policies/privacy/
              </a>
            </p>
          </li>
          <li>
            <strong>Supabase</strong>
            <p>
              Supabase is used for authentication, database, and backend
              services. Their Privacy Policy:
              <br />
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                https://supabase.com/privacy
              </a>
            </p>
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-10">Children’s Privacy</h2>
        <p>
          Our Service does not address anyone under the age of 13. We do not
          knowingly collect personal data from children.
        </p>

        <h2 className="text-xl font-semibold mt-10">
          Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will
          be posted on this page with an updated date.
        </p>

        <h2 className="text-xl font-semibold mt-10">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, you can contact
          us at:
        </p>
        <p>
          <strong>Email:</strong> <a href="mailto:bonfireglobal@gmail.com">bonfireglobal@gmail.com</a>
        </p>
      </div>
      </main>
    </>
  );
}
