export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
            How It Works
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get started with soil analysis in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
              1
            </div>
            <h4 className="text-xl font-serif font-bold text-green-800">
              Data Input
            </h4>
            <p className="text-gray-600 font-serif">
              Input your GPS location and pH for ML analysis, or add partial/full lab results for high-precision diagnostic modes.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
              2
            </div>
            <h4 className="text-xl font-serif font-bold text-green-800">
              Hybrid Core Analysis
            </h4>
            <p className="text-gray-600 font-serif">
              Our AI-driven engine merges satellite environmental data with user inputs to compute an accurate Soil Health Index (SHI).
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold font-serif shadow-lg">
              3
            </div>
            <h4 className="text-xl font-serif font-bold text-green-800">
              Precision Action
            </h4>
            <p className="text-gray-600 font-serif">
              Receive localized fertilizer recommendations and a ranked list of the nearest Agrovets to procure the required inputs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
