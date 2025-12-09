export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-4">Last updated: December 9, 2025</p>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-gray-700 mb-2">
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Account information (username, email, password)</li>
            <li>Soil analysis data and measurements</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-700">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Provide, maintain, and improve our services</li>
            <li>Generate soil analysis reports and fertilizer recommendations</li>
            <li>Communicate with you about updates and features</li>
            <li>Improve our machine learning models</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">3. Data Security</h2>
          <p className="text-gray-700">
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">4. Data Sharing</h2>
          <p className="text-gray-700">
            We do not sell your personal information. We may share anonymized, aggregated data for research and improvement purposes.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">5. Your Rights</h2>
          <p className="text-gray-700">
            You have the right to access, update, or delete your personal information at any time through your account settings.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">6. Contact Us</h2>
          <p className="text-gray-700">
            If you have any questions about this Privacy Policy, please contact us through the platform.
          </p>
        </section>
      </div>
    </div>
  );
}
