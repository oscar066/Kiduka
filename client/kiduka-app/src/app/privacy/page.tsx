export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: May 27, 2026</p>

      <div className="prose max-w-none space-y-8">

        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p className="text-gray-700">
            Kiduka Labs (&quot;Kiduka&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, store, and share your personal information when you use the Kiduka
            platform at{" "}
            <a href="https://kiduka-labs.co.ke" className="text-green-700 underline">
              kiduka-labs.co.ke
            </a>{" "}
            (the &quot;Service&quot;). It also describes your rights under applicable data protection law, including the Kenya
            Data Protection Act, 2019.
          </p>
          <p className="text-gray-700 mt-3">
            By using the Service, you agree to the collection and use of information as described in this policy.
            Please read it carefully alongside our{" "}
            <a href="/terms" className="text-green-700 underline">
              Terms of Service
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
          <p className="text-gray-700 mb-3">We collect information in the following ways:</p>

          <h3 className="text-lg font-semibold mb-2 text-gray-800">2.1 Information you provide directly</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
            <li>Account details — name, email address, and password when you register</li>
            <li>Farm and soil data — soil test results, field locations, and crop information you enter into the platform</li>
            <li>Communications — messages or queries you submit through our agricultural assistant or support channels</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2 text-gray-800">2.2 Information collected automatically</h3>
          <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
            <li>Usage data — pages visited, features used, and actions taken within the Service</li>
            <li>Device and access information — browser type, operating system, IP address, and approximate location derived from your IP</li>
            <li>Session data — login times and session duration</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2 text-gray-800">2.3 Location information</h3>
          <p className="text-gray-700">
            If you choose to use location-based features (such as finding nearby agro-dealers), we may request access
            to your device location. This is optional and can be declined without affecting core platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-3">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Create and manage your account and provide access to the Service</li>
            <li>Generate soil analysis results, fertiliser recommendations, and agronomic reports</li>
            <li>Pre-fill forms with your most recent analysis data to improve your experience</li>
            <li>Respond to your queries and provide customer support</li>
            <li>Send you important service-related communications such as security alerts or policy updates</li>
            <li>Monitor and improve the reliability, safety, and quality of the Service</li>
            <li>Comply with legal obligations under Kenyan law</li>
          </ul>
          <p className="text-gray-700 mt-3">
            We do not use your personal information to send marketing communications without your explicit consent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. How We Share Your Information</h2>
          <p className="text-gray-700 mb-3">
            We do not sell your personal information. We may share your data in the following limited circumstances:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              <span className="font-medium">Service providers:</span> Trusted third-party suppliers who help us operate
              the platform (such as hosting, infrastructure, and analytics providers) under strict confidentiality
              agreements.
            </li>
            <li>
              <span className="font-medium">Legal requirements:</span> When required by law, court order, or government
              authority under applicable Kenyan legislation.
            </li>
            <li>
              <span className="font-medium">Business transfers:</span> In the event of a merger, acquisition, or sale
              of assets, your information may be transferred as part of that transaction. We will notify you before
              your data becomes subject to a different privacy policy.
            </li>
            <li>
              <span className="font-medium">Aggregated research data:</span> We may share anonymised, aggregated
              insights derived from soil and agronomic data for research or agricultural development purposes. No
              individual user can be identified from this data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Data Retention</h2>
          <p className="text-gray-700">
            We retain your personal information for as long as your account is active or as necessary to provide the
            Service. If you delete your account, we will delete or anonymise your personal data within 30 days, except
            where retention is required by law or legitimate business necessity (for example, to resolve disputes or
            comply with regulatory obligations).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Data Security</h2>
          <p className="text-gray-700">
            We implement appropriate technical and organisational measures to protect your personal information against
            unauthorised access, alteration, disclosure, or destruction. These include secure data transmission,
            access controls, and regular security reviews.
          </p>
          <p className="text-gray-700 mt-3">
            However, no method of transmission over the internet or electronic storage is completely secure. While we
            strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute
            security. You are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Cookies and Tracking</h2>
          <p className="text-gray-700">
            We use session cookies and similar technologies to keep you logged in and to understand how the Service is
            used. These are strictly necessary for the platform to function. We do not use third-party advertising
            cookies or tracking technologies for commercial profiling. You can configure your browser to refuse cookies,
            though this may affect your ability to use certain features of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Your Rights</h2>
          <p className="text-gray-700 mb-3">
            Under the Kenya Data Protection Act, 2019, you have the following rights regarding your personal data:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><span className="font-medium">Right of access</span> — request a copy of the personal data we hold about you</li>
            <li><span className="font-medium">Right to rectification</span> — ask us to correct inaccurate or incomplete information</li>
            <li><span className="font-medium">Right to erasure</span> — request deletion of your personal data, subject to legal obligations</li>
            <li><span className="font-medium">Right to object</span> — object to the processing of your data in certain circumstances</li>
            <li><span className="font-medium">Right to data portability</span> — receive your data in a structured, commonly used format</li>
            <li><span className="font-medium">Right to withdraw consent</span> — where processing is based on consent, withdraw it at any time without affecting prior processing</li>
          </ul>
          <p className="text-gray-700 mt-3">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@kiduka-labs.co.ke" className="text-green-700 underline">
              support@kiduka-labs.co.ke
            </a>
            . We will respond within 30 days of receiving your request.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Children&apos;s Privacy</h2>
          <p className="text-gray-700">
            The Service is not directed at children under the age of 18. We do not knowingly collect personal
            information from anyone under 18. If you believe a minor has provided us with personal data, please
            contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
          <p className="text-gray-700">
            We may update this Privacy Policy from time to time. When we make material changes, we will update the
            &quot;Last updated&quot; date at the top of this page and, where appropriate, notify you by email or through a
            prominent notice within the Service. Your continued use of the Service after changes are posted constitutes
            your acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
          <p className="text-gray-700 mb-3">
            If you have any questions, concerns, or complaints about this Privacy Policy or how we handle your data,
            please contact us:
          </p>
          <ul className="list-none pl-0 text-gray-700 space-y-1">
            <li>
              <span className="font-medium">Email:</span>{" "}
              <a href="mailto:support@kiduka-labs.co.ke" className="text-green-700 underline">
                support@kiduka-labs.co.ke
              </a>
            </li>
            <li>
              <span className="font-medium">Website:</span>{" "}
              <a href="https://kiduka-labs.co.ke" className="text-green-700 underline">
                kiduka-labs.co.ke
              </a>
            </li>
          </ul>
          <p className="text-gray-700 mt-3">
            You also have the right to lodge a complaint with the Office of the Data Protection Commissioner of Kenya
            if you believe your data protection rights have been violated.
          </p>
        </section>

      </div>
    </div>
  );
}
