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

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Einleitung */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Datenschutz auf einen Blick
              </h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">
                Allgemeine Hinweise
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
                Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
                Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
                identifiziert werden können. Ausführliche Informationen zum Thema
                Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
                Datenschutzerklärung.
              </p>
            </section>

            {/* Verantwortliche Stelle */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Allgemeine Hinweise und Pflichtinformationen
              </h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">
                Verantwortliche Stelle
              </h3>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
              </p>
              <div className="text-neutral-300 leading-relaxed space-y-1 mb-4">
                <p className="font-medium text-white">David Kosma</p>
                <p>Wennfelder Garten 5</p>
                <p>72072 Tübingen</p>
                <p className="mt-2">
                  Telefon:{' '}
                  <a href="tel:+4917656551076" className="hover:text-white transition-colors">
                    017656551076
                  </a>
                </p>
                <p>
                  E-Mail:{' '}
                  <a
                    href="mailto:david.kosma@kosmamedia.de"
                    className="hover:text-white transition-colors"
                  >
                    david.kosma@kosmamedia.de
                  </a>
                </p>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Verantwortliche Stelle ist die natürliche oder juristische Person, die allein
                oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
                personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
              </p>
            </section>

            {/* Speicherdauer */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                Speicherdauer
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer
                genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck
                für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen
                geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen,
                werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen
                Gründe für die Speicherung Ihrer personenbezogenen Daten haben.
              </p>
            </section>

            {/* Rechtsgrundlage */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                Rechtsgrundlage für die Datenverarbeitung
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Wir verarbeiten Ihre personenbezogenen Daten nur, wenn eine Rechtsgrundlage
                besteht. Rechtsgrundlage ist insbesondere Art. 6 Abs. 1 DSGVO:
              </p>
              <ul className="list-disc list-inside text-neutral-300 leading-relaxed space-y-2 ml-4 mt-3">
                <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
                <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</li>
                <li>Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO)</li>
                <li>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO)</li>
              </ul>
            </section>

            {/* Datenerfassung */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Datenerfassung auf dieser Website
              </h2>
              <h3 className="text-xl font-semibold text-white mb-3">
                Cookies
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Unsere Internetseiten verwenden sogenannte &quot;Cookies&quot;. Cookies sind kleine
                Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden
                entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder
                dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
              </p>
            </section>

            {/* Server-Log-Dateien */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                Server-Log-Dateien
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so
                genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
                Dies sind:
              </p>
              <ul className="list-disc list-inside text-neutral-300 leading-relaxed space-y-2 ml-4 mt-3">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p className="text-neutral-300 leading-relaxed mt-3">
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht
                vorgenommen. Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6
                Abs. 1 lit. f DSGVO.
              </p>
            </section>

            {/* Kontaktformular */}
            <section>
              <h3 className="text-xl font-semibold text-white mb-3">
                Anfrage per E-Mail oder Telefon
              </h3>
              <p className="text-neutral-300 leading-relaxed">
                Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage
                inklusive aller daraus hervorgehenden personenbezogenen Daten (Name, Anfrage)
                zum Zwecke der Bearbeitung Ihres Anliegens bei uns gespeichert und
                verarbeitet. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
              </p>
            </section>

            {/* Ihre Rechte */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Ihre Rechte
              </h2>
              <p className="text-neutral-300 leading-relaxed mb-3">
                Sie haben jederzeit das Recht:
              </p>
              <ul className="list-disc list-inside text-neutral-300 leading-relaxed space-y-2 ml-4">
                <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten (Art. 15 DSGVO)</li>
                <li>Berichtigung unrichtiger personenbezogener Daten zu verlangen (Art. 16 DSGVO)</li>
                <li>Löschung Ihrer bei uns gespeicherten Daten zu verlangen (Art. 17 DSGVO)</li>
                <li>Einschränkung der Datenverarbeitung zu verlangen (Art. 18 DSGVO)</li>
                <li>Widerspruch gegen die Verarbeitung einzulegen (Art. 21 DSGVO)</li>
                <li>Datenübertragbarkeit zu verlangen (Art. 20 DSGVO)</li>
                <li>Eine erteilte Einwilligung zur Datenverarbeitung jederzeit zu widerrufen (Art. 7 Abs. 3 DSGVO)</li>
              </ul>
              <p className="text-neutral-300 leading-relaxed mt-4">
                Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über
                die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
              </p>
            </section>

            {/* Kontakt Datenschutz */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Kontakt in Datenschutzfragen
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Bei Fragen zum Datenschutz erreichen Sie uns unter:
              </p>
              <div className="mt-3 text-neutral-300">
                <p>
                  E-Mail:{' '}
                  <a
                    href="mailto:david.kosma@kosmamedia.de"
                    className="text-white hover:underline"
                  >
                    david.kosma@kosmamedia.de
                  </a>
                </p>
                <p>
                  Telefon:{' '}
                  <a href="tel:+4917656551076" className="text-white hover:underline">
                    017656551076
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
