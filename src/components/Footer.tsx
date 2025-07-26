import Link from "next/link";
import React from "react";
import Image from "next/image";

const siteDetails = {
  siteName: "CTEnvios Online",
  logoSrc: "/ctelogo.png",
};

const footerDetails = {
  Address: "10230 NW 80th Ave, Hialeah Gardens, FL 33016",
  Horario: "Monday - Sunday: 9am - 5pm",
  email: "leidivioleta@gmail.com",
  telephone: "+1 (786) 451-9573",
  socials: {
    Facebook: "https://www.facebook.com/ctenvio/",
    Instagram: "https://www.instagram.com/ctenvios/",
    WhatsApp: "https://wa.me/17864519573",
  },
};

const getPlatformIconByName = (name: string) => {
  const icons: Record<string, React.ReactNode> = {
    Facebook: (
      <svg
        className="w-6 h-6 fill-current text-white hover:text-green-400"
        viewBox="0 0 24 24"
      >
        <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 5 3.657 9.127 8.438 9.877v-6.987H7.898v-2.89h2.54v-2.2c0-2.507 1.492-3.89 3.778-3.89 1.094 0 2.238.196 2.238.196v2.46h-1.26c-1.243 0-1.63.77-1.63 1.562v1.872h2.773l-.443 2.89h-2.33v6.987C18.343 21.126 22 17 22 12" />
      </svg>
    ),
    Instagram: (
      <svg
        className="w-6 h-6 fill-current text-white hover:text-green-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 448 512"
      >
        <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9 
          114.9-51.3 114.9-114.9S287.7 141 224.1 141zm0 
          186.6c-39.6 0-71.7-32.1-71.7-71.7s32.1-71.7 
          71.7-71.7 71.7 32.1 71.7 71.7-32.1 71.7-71.7 
          71.7zm146.4-194.3c0 14.9-12 26.9-26.9 
          26.9s-26.9-12-26.9-26.9 12-26.9 
          26.9-26.9 26.9 12 26.9 26.9zm76.1 
          27.2c-1.7-35.7-9.9-67.3-36.2-93.5S364.8 
          37.6 329.1 35.9c-35.7-1.7-142.8-1.7-178.5 
          0-35.7 1.7-67.3 9.9-93.5 36.2S37.6 147.2 
          35.9 182.9c-1.7 35.7-1.7 142.8 0 
          178.5 1.7 35.7 9.9 67.3 36.2 93.5s57.8 
          34.5 93.5 36.2c35.7 1.7 142.8 1.7 178.5 
          0 35.7-1.7 67.3-9.9 93.5-36.2 
          26.3-26.3 34.5-57.8 36.2-93.5 
          1.7-35.7 1.7-142.8 0-178.5zM398.8 
          388c-7.8 19.6-22.9 34.7-42.6 
          42.6-29.5 11.7-99.5 9-132.1 
          9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 
          9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 
          29.5-11.7 99.5-9 132.1-9s102.7-2.6 
          132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 
          11.7 29.5 9 99.5 9 132.1s2.6 
          102.7-9 132.1z" />
      </svg>
    ),
    WhatsApp: (
      <svg
        className="w-6 h-6 fill-current text-white hover:text-green-400"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16.001 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.827.827 5.468 2.24 7.705L2.68 29.32a1.34 1.34 0 0 0 1.653 1.652l5.614-2.227A13.288 13.288 0 0 0 16 29.334c7.36 0 13.334-5.974 13.334-13.334S23.36 2.667 16 2.667zm0 24a10.666 10.666 0 0 1-5.44-1.467l-.4-.24-3.36 1.333 1.333-3.36-.24-.4A10.66 10.66 0 1 1 16 26.667zm5.36-7.493c-.293-.147-1.733-.867-2.007-.973-.267-.107-.467-.16-.667.107s-.76.973-.933 1.173c-.16.187-.347.213-.64.067-1.76-.88-2.907-1.573-4.053-3.493-.307-.533.307-.493.88-1.64.093-.187.047-.347-.027-.493-.08-.147-.667-1.6-.907-2.187-.24-.56-.48-.48-.667-.48-.173-.013-.347-.013-.533-.013-.187 0-.493.067-.76.32-.267.267-1.013.987-1.013 2.4s1.04 2.787 1.187 2.987c.16.213 2.053 3.12 5.027 4.373.707.307 1.253.493 1.787.64.747.213 1.427.187 1.973.107.6-.093 1.733-.707 1.973-1.387.24-.693.24-1.293.173-1.387-.08-.107-.267-.173-.56-.293z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// Definir tipos para nav y footer
type NavLinks = {
  [key: string]: string;
};

type FooterDict = {
  subheading: string;
  quickLinksTitle: string;
  addressLabel: string;
  hoursLabel: string;
  emailLabel: string;
  phoneLabel: string;
  contactTitle: string;
  copyright: string;
};

type Dict = {
  footer: FooterDict;
  nav: NavLinks;
};

const navUrls: Record<string, string> = {
  services: "#hero",
  about: "#about",
  faq: "#faq",
  contact: "#contact",
};

const Footer: React.FC<{ dict: Dict }> = ({ dict }) => {
  const f = dict.footer;
  const nav = dict.nav;

  return (
    <footer className="bg-green-900 text-white py-10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Logo y subtítulo */}
        <div>
          <Link href="/" className="flex items-center gap-3">
          <Image
            src={siteDetails.logoSrc}
            alt={`${siteDetails.siteName} Logo`}
            width={0}
            height={0}
            sizes="100vw"
            className="w-12 sm:w-14 md:w-16 lg:w-18 xl:w-20 h-auto rounded-xl object-contain"
          />
            <h3 className="text-xl font-semibold cursor-pointer">{siteDetails.siteName}</h3>
          </Link>
          <p className="mt-4 font-light text-lg">{f.subheading}</p>
        </div>

        {/* Quick Links desde dict.nav */}
        <div>
          <h4 className="text-lg font-semibold mb-4">{f.quickLinksTitle}</h4>
          <ul className="font-light text-sm space-y-2">
            {Object.keys(nav).map((key) => (
              <li key={key}>
                <Link href={navUrls[key] || "#"} className="hover:text-green-400 transition">
                  {nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contacto y redes */}
        <div id="contact">
          <h4 className="text-lg font-semibold mb-4">{f.contactTitle}</h4>
          <div className="flex flex-col gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                footerDetails.Address
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-light hover:text-green-400 transition"
            >
              {f.addressLabel}: {footerDetails.Address}
            </a>
            <span className="text-sm font-light">
              {f.hoursLabel}: {footerDetails.Horario}
            </span>
            <a
              href={`mailto:${footerDetails.email}`}
              className="text-sm font-light hover:text-green-400 transition"
            >
              {f.emailLabel}: {footerDetails.email}
            </a>
            <a
              href={`tel:${footerDetails.telephone}`}
              className="text-sm font-light hover:text-green-400 transition"
            >
              {f.phoneLabel}: {footerDetails.telephone}
            </a>
          </div>

          <div className="mt-6 flex items-center gap-5">
            {Object.keys(footerDetails.socials).map((platformName) => {
              const url =
                footerDetails.socials[platformName as keyof typeof footerDetails.socials];
              return (
                <Link
                  key={platformName}
                  href={url}
                  aria-label={platformName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-green-400 transition"
                >
                  {getPlatformIconByName(platformName)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-white text-xs px-6">
        &copy; {new Date().getFullYear()} {siteDetails.siteName}. {f.copyright}
      </div>
    </footer>
  );
};

export default Footer;
