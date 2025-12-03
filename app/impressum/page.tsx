import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Startseite
        </Link>

        {/* Content */}
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-neutral-800">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Impressum
          </h1>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              Angaben gemäß § 5 TMG
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              KosmaMedia<br />
              David Kosma<br />
              [Adresse]<br />
              [PLZ Ort]
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              Kontakt
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              E-Mail:{' '}
              <a
                href="mailto:david.kosma@kosmamedia.de"
                className="text-white hover:underline"
              >
                david.kosma@kosmamedia.de
              </a>
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              David Kosma<br />
              [Adresse]<br />
              [PLZ Ort]
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              Haftungsausschluss
            </h2>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Haftung für Inhalte
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt.
              Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
              können wir jedoch keine Gewähr übernehmen.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Haftung für Links
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf
              deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
              diese fremden Inhalte auch keine Gewähr übernehmen.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Urheberrecht
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
              diesen Seiten unterliegen dem deutschen Urheberrecht.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

