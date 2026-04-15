import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Dr. John Kamau",
      role: "Agriculture Research Officer",
      content: "Kiduka's triple-mode architecture is a game-changer. The way it prioritizes lab data while using ML for gap-filling provides a level of precision I haven't seen in other platforms.",
      rating: 5,
    },
    {
      name: "David Omondi",
      role: "Commercial Maize Farmer",
      content: "The localized Agrovet recommendations saved me days of searching. It pointed me exactly to where I could find the DAP and CAN for my specific soil needs.",
      rating: 5,
    },
    {
      name: "Sarah Wanjiru",
      role: "Precision Agronomist",
      content: "The integration with Google Earth Engine for NDVI and SAR data provides a highly accurate environmental signature. It's sophisticated yet remarkably easy for my clients to use.",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-20 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-serif font-bold text-green-800 mb-4">
            What Our Users Say
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of satisfied farmers and agronomists who trust Kiduka
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-amber-200 hover:shadow-xl transition-shadow">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-center">
                  <Quote className="h-12 w-12 text-green-200" />
                </div>
                <div className="flex justify-center space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic text-center">
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="font-semibold text-green-800">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
