import Link from "next/link";

interface FooterProps {
  scrollToSection: (sectionId: string) => void;
}

const quickLinks = [
  { label: "Architecture", section: "architecture" },
  { label: "Agrovets", section: "agrovets" },
  { label: "How It Works", section: "how-it-works" },
  { label: "Testimonials", section: "testimonials" },
  { label: "FAQ", section: "faq" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function Footer({ scrollToSection }: FooterProps) {
  return (
    <footer className="bg-green-950 text-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src="/images/kiduka_logo.png"
                  alt="Kiduka Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xl font-serif font-bold text-white">
                Kiduka Labs
              </span>
            </div>
            <p className="text-green-400 text-sm leading-relaxed">
              Empowering Kenyan agriculture through AI-driven soil analysis and
              data-powered farming decisions.
            </p>
            <div className="flex gap-3 pt-1">
              <Link href="/auth/signup">
                <span className="inline-block text-xs font-semibold bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
                  Get Started Free →
                </span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h5 className="text-white font-semibold text-sm uppercase tracking-wider">
              Quick Links
            </h5>
            <ul className="space-y-2.5">
              {quickLinks.map(({ label, section }) => (
                <li key={section}>
                  <button
                    onClick={() => scrollToSection(section)}
                    className="text-green-400 hover:text-white text-sm transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Legal */}
          <div className="space-y-4">
            <h5 className="text-white font-semibold text-sm uppercase tracking-wider">
              Support
            </h5>
            <p className="text-green-400 text-sm leading-relaxed">
              Have questions? Our team is here to help farmers and agronomists
              get the most out of Kiduka.
            </p>
            <div className="space-y-2">
              {legalLinks.map(({ label, href }) => (
                <div key={href}>
                  <Link
                    href={href}
                    className="text-green-400 hover:text-white text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-green-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-green-600">
          <p>&copy; {new Date().getFullYear()} Kiduka Labs. All rights reserved.</p>
          <p>Built for Kenya&apos;s farming future.</p>
        </div>
      </div>
    </footer>
  );
}
