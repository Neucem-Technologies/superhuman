import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · LivinSync" },
      {
        name: "description",
        content:
          "How LivinSync collects, uses, stores, and shares personal data. Public policy for app and OAuth verification.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground md:px-12">
      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-subtle">LivinSync</p>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted">Effective 11 September 2026 · Last updated 11 September 2026</p>
          <p className="text-sm leading-relaxed text-muted">
            This page is public. You do not need an account to read it. Reviewers and users can open{" "}
            <span className="text-foreground">/privacy</span> on this same host.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. Who we are</h2>
          <p className="text-sm leading-relaxed text-muted">
            LivinSync is a personal operating system for work, health, money, people, and daily life. It is
            operated by Rajan Malhotra (“we”, “us”). The product is local-first: most of your OS data stays on
            the device you use. This policy covers the LivinSync web app, the installable iPhone and Android
            experience (PWA), and optional sign-in or connector links.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. What we collect</h2>
          <p className="text-sm leading-relaxed text-muted">We only collect what you put into LivinSync or allow it to read.</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            <li>
              <span className="text-foreground">Account (optional).</span> If you sign in: name, email, and
              identifiers from email/password or Google / X sign-in.
            </li>
            <li>
              <span className="text-foreground">OS content you create.</span> Calendar, tasks, notes, reminders,
              health check-ins, shopping lists, files you attach, and similar records. These live on your
              device unless you later connect a cloud service.
            </li>
            <li>
              <span className="text-foreground">Voice.</span> If you speak in the bar, audio is sent to a speech
              service to transcribe it. We do not keep the recording after the transcript is returned.
            </li>
            <li>
              <span className="text-foreground">Chat and files you drop in the bar.</span> Text and short file
              excerpts may be sent to our language model so LivinSync can classify and answer.
            </li>
            <li>
              <span className="text-foreground">Location (optional).</span> With your browser permission, we
              use approximate coordinates to show local weather and place name. Family map pins are shown only
              for people in your family circle when location sharing is enabled.
            </li>
            <li>
              <span className="text-foreground">Device preferences.</span> Contrast mode, layout, install
              prompts, and similar settings in local storage.
            </li>
            <li>
              <span className="text-foreground">Connected services (optional).</span> Only after you connect
              them. See section 5.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-muted">
            We do not scrape your device in the background. We do not sell personal data. We do not run
            advertising networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. How we use data</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            <li>To run your personal OS: today, tasks, health, money, travel, people.</li>
            <li>To sign you in and keep the same identity across sessions when auth is on.</li>
            <li>To transcribe voice and answer asks in the bar.</li>
            <li>To show weather for your current place, if you allow location.</li>
            <li>To sync with a service you explicitly connect (mail, calendar, drive, music, and so on).</li>
            <li>To keep the app secure and fix failures.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. Legal bases</h2>
          <p className="text-sm leading-relaxed text-muted">
            Where Indian Digital Personal Data Protection Act, 2023 or similar rules apply, we process data
            with your consent (sign-in, location, microphone, connectors) and as needed to provide the service
            you asked for. You can withdraw consent by disconnecting a service, denying browser permissions,
            signing out, or clearing this site’s data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. Connected services and Google user data</h2>
          <p className="text-sm leading-relaxed text-muted">
            LivinSync can connect to third-party APIs you choose. Typical examples: Google (Gmail, Calendar,
            Contacts, Drive, YouTube), WhatsApp, UltraHuman, Spotify, travel, banking / UPI, GST / books, and
            shopping partners. Each connection is off until you turn it on and provide credentials or OAuth
            consent.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            <span className="text-foreground">Google user data — Limited Use.</span> If you grant Google
            access, LivinSync uses Gmail, Calendar, Contacts, Drive, and/or YouTube data only to provide the
            visible features in Work, Files, and Enjoy (for example: show upcoming events, file a note from
            mail, list Drive files you open). We do not use Google user data to train generalized AI/ML
            models. We do not sell it. We do not share it with ads. We do not transfer it to other apps except
            as needed to run LivinSync for you, or if required by law. This use complies with the Google API
            Services User Data Policy, including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">6. Processors</h2>
          <p className="text-sm leading-relaxed text-muted">
            To run the product we may send data to subprocessors acting for us: hosting for this app, Better
            Auth for sign-in, xAI for chat and speech-to-text, and the provider of any connector you enable
            (Google, Meta, Spotify, and others listed in Connectors). They receive only what that feature
            needs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">7. Sharing</h2>
          <p className="text-sm leading-relaxed text-muted">
            We do not sell personal information. We share only: (a) with processors above; (b) with people you
            invite as contributors, limited to the tabs and access you grant; (c) if required by law; (d) if
            we transfer the product, under this same policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">8. Retention and deletion</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            <li>On-device OS data stays until you delete it in the app or clear site storage in the browser.</li>
            <li>Account data is kept while the account is open. Sign out from Profile. To delete the account and
              associated server records, email the contact below; we will delete within 30 days unless the law
              requires a longer hold.</li>
            <li>Voice audio is processed for transcription and is not stored by LivinSync.</li>
            <li>Weather cache is short-lived on the device (session).</li>
            <li>Connector tokens are stored so the link keeps working; disconnecting revokes our use of that
              service.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">9. Security</h2>
          <p className="text-sm leading-relaxed text-muted">
            Access is HTTPS. Connector secrets stay on the server, not in the public client bundle. Local OS
            state is in your browser. No method is perfect; do not put secrets you cannot afford to lose into
            notes or chat.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">10. Children</h2>
          <p className="text-sm leading-relaxed text-muted">
            LivinSync is not directed at children under 13. We do not knowingly collect personal data from
            children under 13. Family circle members are added by you; you are responsible for that choice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">11. International</h2>
          <p className="text-sm leading-relaxed text-muted">
            You may use LivinSync from India or elsewhere. Processors may be in other countries (including the
            United States). By using the app you understand that data for AI, auth, or a connector may be
            processed outside your home country under this policy and that provider’s terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">12. Your choices</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            <li>Deny location or microphone in the browser.</li>
            <li>Skip sign-in; the OS still runs locally.</li>
            <li>Disconnect any connector.</li>
            <li>Ask us for a copy or deletion of account data (section 8).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">13. Changes</h2>
          <p className="text-sm leading-relaxed text-muted">
            If we change this policy in a material way, we will update the date at the top of this page. Keep
            using LivinSync after a change means you accept the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">14. Contact</h2>
          <p className="text-sm leading-relaxed text-muted">
            LivinSync · Rajan Malhotra · India
            <br />
            Privacy requests:{" "}
            <a className="text-foreground underline decoration-border underline-offset-2" href="mailto:privacy@livinsync.app">
              privacy@livinsync.app
            </a>
            <br />
            You can also open Profile in the app.
          </p>
        </section>

        <p className="flex flex-wrap gap-4 text-sm">
          <Link to="/" className="text-muted hover:text-foreground">
            Back to app
          </Link>
          <Link to="/login" className="text-muted hover:text-foreground">
            Sign in
          </Link>
        </p>
      </article>
    </main>
  );
}
