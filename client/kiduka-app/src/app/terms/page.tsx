export default function TermsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-gray-500 mb-8">Last updated: May 27, 2026</p>

      <div className="prose max-w-none space-y-8">

        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700">
            By accessing or using the Kiduka platform at{" "}
            <a href="https://kiduka-labs.co.ke" className="text-green-700 underline">
              kiduka-labs.co.ke
            </a>{" "}
            (the &quot;Service&quot;), you confirm that you have read, understood, and agree to be bound by these Terms
            of Service (&quot;Terms&quot;) and our{" "}
            <a href="/privacy" className="text-green-700 underline">
              Privacy Policy
            </a>
            . If you do not agree to these Terms, you must not use the Service. These Terms constitute a legally
            binding agreement between you and Kiduka Labs (&quot;Kiduka&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-gray-700 mb-3">
            Kiduka is an agricultural decision-support platform that provides:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Soil health analysis and fertility classification</li>
            <li>Fertilizer optimisation recommendations based on established agronomic methods</li>
            <li>Crop yield estimates and nutrient management guidance</li>
            <li>Access to nearby agro-dealer (agrovet) information</li>
            <li>An agricultural assistant to answer farming-related questions</li>
          </ul>
          <p className="text-gray-700 mt-3">
            All outputs are generated algorithmically and are intended as informational guidance only. They do not
            constitute professional agronomic, legal, or financial advice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Eligibility</h2>
          <p className="text-gray-700">
            You must be at least 18 years of age to create an account and use the Service. By using the Service, you
            represent and warrant that you meet this age requirement and that you have the legal capacity to enter
            into a binding agreement under the laws of Kenya and any other jurisdiction applicable to you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Account Registration and Security</h2>
          <p className="text-gray-700 mb-3">
            To access most features of the Service you must register for an account. When registering you agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Provide accurate, current, and complete information</li>
            <li>Keep your password confidential and not share it with any third party</li>
            <li>Notify us immediately at{" "}
              <a href="mailto:support@kiduka-labs.co.ke" className="text-green-700 underline">
                support@kiduka-labs.co.ke
              </a>{" "}
              if you suspect any unauthorised use of your account</li>
            <li>Accept responsibility for all activities that occur under your account</li>
          </ul>
          <p className="text-gray-700 mt-3">
            We reserve the right to suspend or terminate accounts where we reasonably suspect fraud, misuse, or a
            breach of these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Acceptable Use</h2>
          <p className="text-gray-700 mb-3">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Use the Service in any way that violates applicable Kenyan law or regulation</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its underlying infrastructure</li>
            <li>Reverse-engineer, decompile, or disassemble any component of the Service</li>
            <li>Scrape, harvest, or systematically collect data from the Service without our prior written consent</li>
            <li>Upload or transmit malicious code, viruses, or any software intended to damage or disrupt the Service</li>
            <li>Impersonate any person or entity, or falsely state your affiliation with any person or entity</li>
            <li>Use the Service to distribute spam, unsolicited communications, or misleading agricultural information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Agricultural Recommendations Disclaimer</h2>
          <p className="text-gray-700 mb-3">
            Kiduka&apos;s soil analysis, fertiliser recommendations, and yield estimates are generated by automated
            analytical methods. They are provided for informational and planning purposes only.
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              Recommendations should be verified by a qualified agronomist or agricultural extension officer before
              application, particularly on large or commercially significant plots.
            </li>
            <li>
              Model outputs may not account for all local soil variability, pest pressure, climatic conditions, or
              other agronomic factors specific to your farm.
            </li>
            <li>
              Fertiliser application rates derived from the Service are estimates. Actual nutrient requirements may
              vary. Over- or under-application resulting from reliance on Service outputs is the sole responsibility
              of the user.
            </li>
            <li>
              We make no warranty that recommendations are suitable for any specific crop variety, farming system,
              or geographic location.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Intellectual Property</h2>
          <p className="text-gray-700 mb-3">
            All content, software, designs, trademarks, and other materials on the Service are owned by
            or licensed to Kiduka Labs and are protected by Kenyan and international intellectual property laws. You
            are granted a limited, non-exclusive, non-transferable licence to access and use the Service for your
            personal or internal business purposes only.
          </p>
          <p className="text-gray-700">
            You retain ownership of any soil data and farm records you submit to the Service. By submitting data, you
            grant us a non-exclusive, royalty-free licence to process and use that data solely for the purposes of
            providing and improving the Service, in accordance with our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Data and Privacy</h2>
          <p className="text-gray-700">
            Your use of the Service is also governed by our{" "}
            <a href="/privacy" className="text-green-700 underline">
              Privacy Policy
            </a>
            , which is incorporated into these Terms by reference. We handle all personal data in compliance with the
            Kenya Data Protection Act, 2019. You may request access to, correction of, or deletion of your personal
            data at any time through your account settings or by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Third-Party Services</h2>
          <p className="text-gray-700">
            The Service may integrate with or display links to third-party services including weather data providers,
            mapping services, and agrovet directories. We do not control and are not responsible for the content,
            privacy practices, or availability of any third-party service. Your use of third-party services is
            subject to their respective terms and conditions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Service Availability and Modifications</h2>
          <p className="text-gray-700">
            We aim to keep the Service available at all times but do not guarantee uninterrupted access. We may
            modify, suspend, or discontinue any part of the Service at any time without notice. We may also update
            these Terms at any time. When we make material changes we will update the &quot;Last updated&quot; date at the
            top of this page. Continued use of the Service after changes are posted constitutes your acceptance of
            the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Limitation of Liability</h2>
          <p className="text-gray-700 mb-3">
            To the fullest extent permitted by applicable law:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied,
              including but not limited to warranties of merchantability, fitness for a particular purpose, or
              non-infringement.
            </li>
            <li>
              Kiduka Labs shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of, or inability to use, the Service.
            </li>
            <li>
              Our total aggregate liability to you for any claim arising from these Terms or your use of the Service
              shall not exceed the amount you paid us (if any) in the twelve months preceding the claim.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">12. Indemnification</h2>
          <p className="text-gray-700">
            You agree to indemnify, defend, and hold harmless Kiduka Labs, its directors, employees, and agents from
            and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees)
            arising out of or in any way connected with your use of the Service, your violation of these Terms, or
            your violation of any rights of another person or entity.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">13. Termination</h2>
          <p className="text-gray-700">
            We may suspend or terminate your access to the Service at our sole discretion, without notice, for
            conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any
            other reason. You may terminate your account at any time by contacting us. Upon termination, your right
            to use the Service will immediately cease, though provisions of these Terms that by their nature should
            survive termination will do so.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">14. Governing Law and Dispute Resolution</h2>
          <p className="text-gray-700">
            These Terms are governed by and construed in accordance with the laws of the Republic of Kenya. Any
            dispute arising from or relating to these Terms or your use of the Service shall first be attempted to
            be resolved through good-faith negotiation. If not resolved within 30 days, the dispute shall be
            submitted to the exclusive jurisdiction of the courts of Nairobi, Kenya.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">15. Contact Us</h2>
          <p className="text-gray-700">
            If you have any questions, concerns, or feedback about these Terms, please contact us:
          </p>
          <ul className="list-none pl-0 mt-3 text-gray-700 space-y-1">
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
        </section>

      </div>
    </div>
  );
}
