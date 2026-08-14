import Link from "next/link";

export const metadata = { title: "Mentions légales | Kelo Social" };

export default function LegalNoticePage() {
  return (
    <main className="min-h-screen bg-kelo-background px-4 py-10 text-kelo-text sm:px-6">
      <article className="mx-auto max-w-4xl rounded-3xl border border-kelo-border bg-white p-6 shadow-kelo sm:p-10">
        <Link href="/" className="text-sm font-bold text-kelo-primary hover:underline">← Retour à Kelo Social</Link>
        <h1 className="mt-6 text-3xl font-black sm:text-4xl">Mentions légales — Kelo Social</h1>
        <p className="mt-2 text-sm text-kelo-muted">Dernière mise à jour : Samedi 15 août 2026</p>

        <div className="mt-10 space-y-8 leading-7">
          <section><h2 className="text-xl font-extrabold">1. Éditeur de Kelo Social</h2><p className="mt-3">Kelo Social est un projet personnel et non lucratif proposant un réseau social reposant notamment sur AT Protocol.</p><div className="mt-3"><p><strong>Responsable :</strong> M Maréchal</p><p><strong>Pays :</strong> Belgique</p><p><strong>Adresse :</strong> Province de Liège, Esneux</p><p><strong>E-mail :</strong> contact@kelosocial.eu</p><p><strong>Site :</strong> kelosocial.eu</p></div><p className="mt-3">Kelo Social n&apos;est actuellement ni une société commerciale ni une association constituée. Le projet est exploité à titre personnel et sans but lucratif.</p></section>

          <section><h2 className="text-xl font-extrabold">2. Hébergement</h2><p className="mt-3">L&apos;application web Kelo Social est hébergée par Vercel Inc.</p><p className="mt-3">440 N Barranca Avenue #4133<br/>Covina, CA 91723<br/>États-Unis</p><p className="mt-3">Certaines données et certains contenus peuvent être hébergés sur des Personal Data Servers (« PDS ») distincts dans le cadre d&apos;AT Protocol.</p></section>

          <section><h2 className="text-xl font-extrabold">3. AT Protocol</h2><p className="mt-3">Kelo Social utilise AT Protocol, un protocole décentralisé.</p><p className="mt-3">Kelo Social est un service indépendant et n&apos;est pas édité, exploité ou contrôlé par Bluesky Social PBC.</p><p className="mt-3">Certains PDS, AppViews et autres services utilisés avec Kelo Social peuvent être exploités par des tiers et rester soumis à leurs propres conditions.</p></section>

          <section><h2 className="text-xl font-extrabold">4. Propriété intellectuelle</h2><p className="mt-3">Sauf indication contraire, les créations originales propres à Kelo Social, notamment son identité visuelle, son logo, ses créations graphiques, ses éléments d&apos;interface originaux, ses textes, ses illustrations et son code source propriétaire, sont protégées par les droits de propriété intellectuelle applicables.</p><p className="mt-3">L&apos;utilisation de Kelo Social n&apos;entraîne aucune cession de ces droits.</p><p className="mt-3">Toute reproduction, adaptation, extraction, distribution, commercialisation ou exploitation d&apos;un élément protégé appartenant à Kelo Social nécessite l&apos;autorisation préalable de son titulaire, sauf lorsqu&apos;une utilisation est expressément autorisée par la loi ou par une licence applicable.</p><p className="mt-3">Il est notamment interdit d&apos;utiliser sans autorisation l&apos;identité de Kelo Social d&apos;une manière susceptible de créer une confusion quant à l&apos;origine d&apos;un service, son affiliation ou l&apos;existence d&apos;un partenariat avec Kelo Social.</p><p className="mt-3">Les marques, logiciels, protocoles et contenus appartenant à des tiers restent la propriété de leurs titulaires respectifs. Kelo Social ne revendique notamment aucun droit de propriété sur AT Protocol, Bluesky ou les composants open source utilisés par le service.</p></section>

          <section><h2 className="text-xl font-extrabold">5. Nom et identité Kelo Social</h2><p className="mt-3">Le nom Kelo Social, son logo et les autres signes distinctifs du service ne peuvent pas être utilisés pour faire croire qu&apos;un produit, une plateforme, une organisation ou un service est officiellement exploité, approuvé ou partenaire de Kelo Social lorsqu&apos;aucune autorisation n&apos;a été accordée.</p></section>

          <section><h2 className="text-xl font-extrabold">6. Contenus des utilisateurs</h2><p className="mt-3">Les utilisateurs restent responsables des contenus qu&apos;ils publient.</p><p className="mt-3">La présence d&apos;un contenu sur Kelo Social ne signifie pas que Kelo Social en est l&apos;auteur ou en revendique la propriété.</p></section>

          <section><h2 className="text-xl font-extrabold">7. Disponibilité</h2><p className="mt-3">Kelo Social est un projet en développement. Le service peut être modifié, temporairement interrompu ou indisponible notamment en raison d&apos;opérations de maintenance ou de problèmes provenant d&apos;infrastructures tierces.</p></section>

          <section><h2 className="text-xl font-extrabold">8. Responsabilité</h2><p className="mt-3">Kelo Social ne peut être tenu responsable des dysfonctionnements directement imputables à des infrastructures tierces sur lesquelles Kelo Social n&apos;exerce aucun contrôle, sous réserve des responsabilités qui ne peuvent légalement être exclues.</p><p className="mt-3">Aucune disposition des présentes mentions légales n&apos;a pour objectif de supprimer ou limiter un droit lorsque la législation applicable l&apos;interdit.</p></section>

          <section><h2 className="text-xl font-extrabold">9. Contact</h2><p className="mt-3"><strong>Contact général :</strong> contact@kelosocial.eu</p></section>

          <section><h2 className="text-xl font-extrabold">10. Autres documents</h2><p className="mt-3">L&apos;utilisation de Kelo Social est également encadrée par ses : Conditions Générales d&apos;Utilisation (CGU) ; Politique de confidentialité ; Politique relative aux cookies ; Règles de la communauté et politique de modération ; Politique de vérification et de certification.</p></section>

          <section><h2 className="text-xl font-extrabold">11. Droit applicable</h2><p className="mt-3">Les présentes mentions légales sont régies par le droit belge, sous réserve des dispositions impératives applicables du droit belge et européen.</p><p className="mt-3">En cas de différend, une résolution amiable peut être recherchée préalablement lorsque cela est approprié.</p><p className="mt-3">Les juridictions compétentes sont déterminées conformément aux règles légales applicables.</p></section>
        </div>
      </article>
    </main>
  );
}
