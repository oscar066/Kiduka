interface FooterProps {
  scrollToSection: (sectionId: string) => void;
}

export function Footer({ scrollToSection }: FooterProps) {
  return (
    <footer className="bg-green-900 text-green-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/images/kiduka_logo.png" alt="Kiduka Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-xl font-serif font-bold text-white">Kiduka Labs</span>
            </div>
            <p className="text-green-200 text-sm">
              Empowering agriculture through intelligent soil analysis and data-driven insights.
            </p>
          </div>

          <div className="space-y-4">
            <h5 className="text-white font-semibold">Quick Links</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => scrollToSection("architecture")} className="hover:text-white transition-colors">
                  Architecture
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("agrovets")} className="hover:text-white transition-colors">
                  Agrovets
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("testimonials")} className="hover:text-white transition-colors">
                  Testimonials
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors">
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="text-white font-semibold">Contact</h5>
            <p className="text-green-200 text-sm">
              Have questions? Reach out to our team for support and guidance.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-green-800 text-center text-sm text-green-300">
          <p>&copy; {new Date().getFullYear()} Kiduka Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
