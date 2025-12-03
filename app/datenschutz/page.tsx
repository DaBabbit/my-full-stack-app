import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DatenschutzPage() {
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
            Datenschutzerklärung
          </h1>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              1. Datenschutz auf einen Blick
            </h2>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Allgemeine Hinweise
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Die folgenden Hinweise geben einen einfachen Überblick darüber,
              was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
              Website besuchen. Personenbezogene Daten sind alle Daten, mit
              denen Sie persönlich identifiziert werden können.
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              2. Allgemeine Hinweise und Pflichtinformationen
            </h2>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Datenschutz
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen
              Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
              vertraulich und entsprechend der gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Verantwortliche Stelle
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser
              Website ist:
            </p>
            <p className="text-neutral-300 leading-relaxed">
              KosmaMedia<br />
              David Kosma<br />
              E-Mail:{' '}
              <a
                href="mailto:david.kosma@kosmamedia.de"
                className="text-white hover:underline"
              >
                david.kosma@kosmamedia.de
              </a>
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              3. Datenerfassung auf dieser Website
            </h2>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Cookies
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Diese Website verwendet Cookies. Cookies sind Textdateien, die im
              Internetbrowser bzw. vom Internetbrowser auf dem Computersystem
              des Nutzers gespeichert werden.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">
              Server-Log-Dateien
            </h3>
            <p className="text-neutral-300 leading-relaxed">
              Der Provider der Seiten erhebt und speichert automatisch
              Informationen in so genannten Server-Log-Dateien, die Ihr Browser
              automatisch an uns übermittelt.
            </p>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              4. Ihre Rechte
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Sie haben das Recht:
            </p>
            <ul className="list-disc list-inside text-neutral-300 leading-relaxed space-y-2 ml-4">
              <li>auf Auskunft über Ihre bei uns gespeicherten Daten</li>
              <li>auf Berichtigung unrichtiger personenbezogener Daten</li>
              <li>auf Löschung Ihrer bei uns gespeicherten Daten</li>
              <li>auf Einschränkung der Datenverarbeitung</li>
              <li>auf Datenübertragbarkeit</li>
              <li>auf Widerspruch gegen die Verarbeitung</li>
            </ul>

            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
              5. Kontakt
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Bei Fragen zum Datenschutz erreichen Sie uns unter:{' '}
              <a
                href="mailto:david.kosma@kosmamedia.de"
                className="text-white hover:underline"
              >
                david.kosma@kosmamedia.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

