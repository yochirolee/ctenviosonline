'use client'

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

const siteDetails = {
  siteName: "CTEnvios Online",
  siteName2: "CTEnvios",
  logoSrc: "/ctelogo.png",
};

const footerDetails = {
  Address: "10230 NW 80th Ave, Hialeah Gardens, FL 33016",
  Horario: "24 H",
  email: "soporte@ctenvios.com",
  telephone: "+1 (754)-277-8810",
  socials: {
    Facebook: "https://www.facebook.com/ctenvio/",
    Instagram: "https://www.instagram.com/ctenvios/",
    WhatsApp: "https://wa.me/17542778810",
  },
};

const getPlatformIconByName = (name: string) => {
  const base = "w-5 h-5 fill-current";
  const icons: Record<string, React.ReactNode> = {
    Facebook: (
      <svg className={base} viewBox="0 0 24 24">
        <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 5 3.657 9.127 8.438 9.877v-6.987H7.898v-2.89h2.54v-2.2c0-2.507 1.492-3.89 3.778-3.89 1.094 0 2.238.196 2.238.196v2.46h-1.26c-1.243 0-1.63.77-1.63 1.562v1.872h2.773l-.443 2.89h-2.33v6.987C18.343 21.126 22 17 22 12" />
      </svg>
    ),
    Instagram: (
      <svg className={base} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 
          5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 
          1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 
          1.346-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 
          2a3 3 0 110 6 3 3 0 010-6zm4.5-.9a1.1 1.1 0 11-2.2 
          0 1.1 1.1 0 012.2 0z" />
      </svg>
    ),
    WhatsApp: (
      <svg className={base} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.001 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.827.827 5.468 2.24 7.705L2.68 29.32a1.34 1.34 0 0 0 1.653 1.652l5.614-2.227A13.288 13.288 0 0 0 16 29.334c7.36 0 13.334-5.974 13.334-13.334S23.36 2.667 16 2.667zm0 24a10.666 10.666 0 0 1-5.44-1.467l-.4-.24-3.36 1.333 1.333-3.36-.24-.4A10.66 10.66 0 1 1 16 26.667zm5.36-7.493c-.293-.147-1.733-.867-2.007-.973-.267-.107-.467-.16-.667.107s-.76.973-.933 1.173c-.16.187-.347.213-.64.067-1.76-.88-2.907-1.573-4.053-3.493-.307-.533.307-.493.88-1.64.093-.187.047-.347-.027-.493-.08-.147-.667-1.6-.907-2.187-.24-.56-.48-.48-.667-.48-.173-.013-.347-.013-.533-.013-.187 0-.493.067-.76.32-.267.267-1.013.987-1.013 2.4s1.04 2.787 1.187 2.987c.16.213 2.053 3.12 5.027 4.373.707.307 1.253.493 1.787.64.747.213 1.427.187 1.973.107.6-.093 1.733-.707 1.973-1.387.24-.693.24-1.293.173-1.387-.08-.107-.267-.173-.56-.293z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

type NavLinks = { [key: string]: string };
type FooterDict = {
  subheading: string;
  quickLinksTitle: string;
  addressLabel: string;
  hoursLabel: string;
  emailLabel: string;
  phoneLabel: string;
  contactTitle: string;
  copyright: string;
  madeby:string
};
type Dict = { footer: FooterDict; nav: NavLinks };

const navUrls: Record<string, string> = {
  services: "#hero",
  about: "#about",
  faq: "#faq",
  contact: "#contact",
};

const Footer: React.FC<{ dict: Dict; mode?: 'full' | 'legal' }> = ({ dict, mode = 'full' }) => {
  const pathname = usePathname();
  const locale = (pathname?.split("/")[1] || "es") as 'es' | 'en';
  const f = dict.footer;
  const nav = dict.nav;
  return (
    <footer className="bg-green-950 border-t border-white/10 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Marca (logo cuadrado) */}
          <div>
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                <Image
                  src={siteDetails.logoSrc}
                  alt={`${siteDetails.siteName} Logo`}
                  fill
                  sizes="(max-width: 640px) 36px, 40px"
                  className="object-contain brightness-110 contrast-110 drop-shadow"
                  priority
                />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-green-200/90">
                {siteDetails.siteName}
              </h3>
            </Link>

            <p className="mt-3 text-sm sm:text-base text-green-200/90">{f.subheading}</p>
          </div>

          {/* Enlaces rápidos */}
          {mode === 'full' ? (
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-3">{f.quickLinksTitle}</h4>
              <ul className="text-sm space-y-2">
                {Object.keys(nav).map((key) => (
                  <li key={key}>
                    <Link
                      href={`/${locale}${navUrls[key] || "#"}`}
                      className="hover:text-green-600 transition"
                    >
                      {nav[key]}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`/${locale}/orders`} className="hover:text-green-600 transition">
                    {locale === "es" ? "Mis pedidos" : "My orders"}
                  </Link>
                </li>
              </ul>
              <div className="mt-3">
                <Link href={`/${locale}/terms`} className="text-sm hover:text-green-600 transition">
                  {locale === "es" ? "Términos y Condiciones" : "Terms and Conditions"}
                </Link>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Contacto */}
          <div id="contact">
            <h4 className="text-base sm:text-lg font-semibold mb-3">{f.contactTitle}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(footerDetails.Address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 transition"
              >
                {f.addressLabel}: {footerDetails.Address}
              </a>
              <span className="text-sm">
                {f.hoursLabel}: {footerDetails.Horario}
              </span>
              <a href={`mailto:${footerDetails.email}`} className="hover:text-green-600 transition">
                {f.emailLabel}: {footerDetails.email}
              </a>
              <a href={`tel:${footerDetails.telephone}`} className="hover:text-green-600 transition">
                {f.phoneLabel}: {footerDetails.telephone}
              </a>
            </div>

            {/* Socials con anillo */}
            <div className="mt-5 flex items-center gap-3">
              {Object.keys(footerDetails.socials).map((platformName) => {
                const url = footerDetails.socials[platformName as keyof typeof footerDetails.socials];
                return (
                  <Link
                    key={platformName}
                    href={url}
                    aria-label={platformName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full ring-1 ring-white/15 hover:ring-green-600/40 hover:text-green-600 transition"
                  >
                    {getPlatformIconByName(platformName)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-white/80 text-xs">
          &copy; {new Date().getFullYear()} {siteDetails.siteName2}. {f.copyright} {f.madeby}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
