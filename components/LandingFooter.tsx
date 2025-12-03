'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-black border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Brand */}
          <div>
            <Image
              src="/kosmamedia-logo.svg"
              alt="KosmaMedia"
              width={160}
              height={36}
              className="h-8 w-auto mb-4"
            />
            <p className="text-neutral-500 text-sm">
              © 2025 KosmaMedia. Alle Rechte vorbehalten.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col md:items-end gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="/impressum"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Impressum
              </Link>
              <Link
                href="/datenschutz"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Datenschutz
              </Link>
              <a
                href="mailto:david.kosma@kosmamedia.de"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

