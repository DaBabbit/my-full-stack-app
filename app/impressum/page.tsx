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

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Angaben gemäß § 5 DDG */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Angaben gemäß § 5 DDG
              </h2>
              <div className="text-neutral-300 leading-relaxed space-y-2">
                <p className="font-medium text-white">David Kosma</p>
                <p>Wennfelder Garten 5</p>
                <p>72072 Tübingen</p>
              </div>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Kontakt
              </h2>
              <div className="text-neutral-300 leading-relaxed space-y-2">
                <p>
                  <span className="text-white font-medium">Telefon:</span>{' '}
                  <a href="tel:+4917656551076" className="hover:text-white transition-colors">
                    017656551076
                  </a>
                </p>
                <p>
                  <span className="text-white font-medium">E-Mail:</span>{' '}
                  <a
                    href="mailto:david.kosma@kosmamedia.de"
                    className="hover:text-white transition-colors"
                  >
                    david.kosma@kosmamedia.de
                  </a>
                </p>
              </div>
            </section>

            {/* Umsatzsteuer */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Umsatzsteuer-ID
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Als Kleinunternehmer im Sinne von § 19 Abs. 1 Umsatzsteuergesetz (UStG)
                wird keine Umsatzsteuer berechnet.
              </p>
            </section>

            {/* EU-Streitschlichtung */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                EU-Streitschlichtung
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <br />
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </section>

            {/* Verbraucherstreitbeilegung */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Verbraucher­streit­beilegung / Universal­schlichtungs­stelle
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
                einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            {/* Haftungsausschluss */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Haftung für Inhalte
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf
                diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
                10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
                oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
                forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="text-neutral-300 leading-relaxed mt-4">
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen
                nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
                Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
                Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
                Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Haftung für Links
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
                wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte
                auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist
                stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              </p>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Urheberrecht
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
                Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
                des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
                Autors bzw. Erstellers.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
