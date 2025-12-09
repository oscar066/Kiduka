export default function TermsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-4">Last updated: December 9, 2025</p>
        
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700">
            By accessing and using the Kiduka Agricultural Soil Analysis platform, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">2. Use of Service</h2>
          <p className="text-gray-700">
            Our service provides soil analysis and fertilizer recommendations based on machine learning models. Results are provided for informational purposes only and should be verified by agricultural professionals.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">3. User Responsibilities</h2>
          <p className="text-gray-700">
            Users are responsible for maintaining the confidentiality of their account credentials and for all activities that occur under their account.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">4. Data Usage</h2>
          <p className="text-gray-700">
            We collect and analyze soil data to improve our services. All data is handled according to our Privacy Policy.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">5. Limitation of Liability</h2>
          <p className="text-gray-700">
            The service is provided "as is" without any warranties. We are not liable for any agricultural decisions made based on our recommendations.
          </p>
        </section>
      </div>
    </div>
  );
}
