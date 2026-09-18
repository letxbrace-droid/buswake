import { useEffect, useRef, useState } from 'react';
import { Plaque } from '../composants/Plaque';
import { initiales } from '../domaine/joueur';
import { MESSAGE_MAX, messageValide, type Message } from '../domaine/chat';

export function Chat({
  messages, pseudos, monUid, ouvert, onEnvoyer,
}: {
  messages: readonly Message[];
  pseudos: Record<string, string>;
  monUid: string;
  ouvert: boolean;
  onEnvoyer(texte: string): void;
}) {
  const [texte, setTexte] = useState('');
  const bas = useRef<HTMLDivElement>(null);

  // On colle en bas à chaque message : un fil qui n'avance pas tout seul
  // oblige à faire défiler pour lire ce qu'on vient de recevoir.
  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const nom = (u: string) => pseudos[u] ?? u;

  return (
    <div className="terrain terrain-matchs flex h-full flex-col">
      <header className="px-4 pt-6 pb-3">
        <h1 className="font-[family-name:var(--font-titre)] text-2xl tracking-wide uppercase">
          Discussion
        </h1>
        <p className="mt-0.5 text-xs text-(--color-encre-faible)">
          {ouvert
            ? 'Le fil se ferme 24 h après le match.'
            : 'Fil fermé — le match est passé depuis plus de 24 h.'}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <Plaque className="p-6 text-center">
            <p className="text-sm text-(--color-encre-sec)">
              Rien encore. Lance la discussion.
            </p>
          </Plaque>
        ) : (
          <ul className="flex flex-col gap-2 pb-3">
            {messages.map((m) => {
              const mien = m.auteur === monUid;
              return (
                <li key={m.id} className={`flex gap-2 ${mien ? 'flex-row-reverse' : ''}`}>
                  {!mien && (
                    <span className="mt-auto grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">
                      {initiales(nom(m.auteur))}
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] rounded-(--radius-md) px-3 py-2 ${
                      mien
                        ? 'bg-(--color-vert) text-(--color-fond)'
                        : 'bg-(--color-carte2) text-(--color-encre)'
                    }`}
                  >
                    {!mien && (
                      <p className="mb-0.5 text-[11px] font-semibold text-(--color-encre-sec)">
                        {nom(m.auteur)}
                      </p>
                    )}
                    {/* React échappe le texte : aucun message ne peut injecter
                        de balise, contrairement à une insertion en innerHTML. */}
                    <p className="text-sm break-words">{m.texte}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bas} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!messageValide(texte)) return;
          onEnvoyer(texte.trim());
          setTexte('');
        }}
        className="flex gap-2 border-t border-(--color-bord) bg-(--color-fond)/92 p-3 backdrop-blur-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <label htmlFor="chat-texte" className="sr-only">
          Message
        </label>
        <input
          id="chat-texte"
          value={texte}
          onChange={(e) => setTexte(e.target.value.slice(0, MESSAGE_MAX))}
          disabled={!ouvert}
          placeholder={ouvert ? 'Écris un message' : 'Fil fermé'}
          className="min-w-0 flex-1 rounded-(--radius-pill) border border-white/12 bg-(--color-carte) px-4 py-2.5 text-base disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!ouvert || !messageValide(texte)}
          aria-label="Envoyer"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-(--color-vert) text-(--color-fond) disabled:bg-white/12 disabled:text-(--color-encre-sec)"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M21.3 3.3 3.6 10.6c-.9.4-.8 1.7.2 1.9l7 1.6 1.6 7c.2 1 1.5 1.1 1.9.2l7.3-17.7c.3-.7-.4-1.5-1.3-1.3z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
