import { motion } from 'motion/react';
import { Symbole } from '../composants/Logo';

/** PREMIER LANCEMENT — UN SEUL ÉCRAN.
 *
 *  La v1 est passée d'une visite guidée à un écran unique, et le commentaire
 *  qu'elle a laissé est sans appel : « fini les visites guidées ». Personne
 *  ne lit trois écrans d'explications avant d'avoir vu le produit. On dit ce
 *  que c'est, on promet une chose, et on ouvre la porte.
 *
 *  Ce qui s'apprend ici ne s'apprend pas en lisant : la vraie explication,
 *  c'est le premier match qu'on propose.
 *
 *  Le SYMBOLE seul y figure, jamais le logo complet : le mot répéterait ce
 *  que le titre dit déjà, et deux blocs se concurrenceraient — c'est ce qui
 *  s'était produit à l'essai. Le logo entier identifie l'app sur l'écran de
 *  connexion, juste après.
 */
export function Accueillir({ onCommencer }: { onCommencer(): void }) {
  return (
    <div className="terrain terrain-accueil flex min-h-full flex-col justify-end px-6 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Le SYMBOLE seul, pas le logo complet : le mot répéterait ce que le
            titre dit déjà, et deux blocs se concurrenceraient. */}
        <Symbole taille={56} className="mb-6" />

        <h1 className="font-[family-name:var(--font-titre)] text-6xl leading-[0.92] tracking-wide">
          LE SPORT
          <br />
          SE JOUE
          <br />
          <span className="text-(--color-vert)">ENSEMBLE</span>
        </h1>

        {/* Une promesse, pas une liste de fonctionnalités. */}
        <p className="mt-5 text-base text-(--color-encre-sec)">
          Propose un créneau, les autres votent, et à dix vous jouez.
        </p>

        <button
          type="button"
          onClick={onCommencer}
          className="mt-8 w-full rounded-(--radius-pill) bg-(--color-vert) py-4 text-base font-semibold text-(--color-fond) transition-transform duration-(--duration-doigt) active:scale-[0.98]"
        >
          Commencer
        </button>
      </motion.div>
    </div>
  );
}
