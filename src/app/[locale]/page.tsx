import { getDictionary } from '@/lib/dictionaries'
import HeroSection from "../../components/HeroSection";
import AboutSection from "../../components/AboutSection";
import FAQSection from "../../components/FAQSection";
import Footer from "../../components/Footer";

export type Dict = {
  nav: {services: string; about: string; faq: string; contact: string; }
  hero: { headline: string; subtext: string; quote: string; view: string; }
  offerSection: { headline: string; headline2: string; }
  socialProof: { title: string; title2: string; services: { title: string; description: string; }[] }
  whyChooseUs: { title: string; headline: string; description: string; features: { name: string; description: string; }[] }
  howItWorks: { title: string; title2: string; steps: { title: string; description: string; }[] }
  about: { title: string; description: string; description2: string; description3: string; stats: { name: string; value: string; }[] }
  faq: { label: string; title1: string; title2: string; questions: { q: string; a: string; }[] }
  secondaryCTA: { title1: string; title2: string; description: string; button: string }
  footer: { subheading: string; quickLinksTitle: string; addressLabel: string; hoursLabel: string; emailLabel: string; phoneLabel: string; contactTitle: string; copyright: string }

  checkout: {
    title: string;
    description: string;
    product: string;
    quantity: string;
    total: string;
    pay: string;
  };

  success: {
    title: string;
    message: string;
    continue: string;
  };

  error: {
    title: string;
    message: string;
    retry: string;
    home: string;
  };
  categories: {
    title: string;
    subtitle: string;
    noProducts: string;
    list: {
      food: string;
      clothing: string;
      medicine: string;
      appliances: string;
      hygiene: string;
      technology: string;
    };
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale) as Dict;

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection dict={dict} />
      <AboutSection dict={dict} />
      <FAQSection dict={dict} />
      <Footer dict={dict} />
    </div>
  );
}
