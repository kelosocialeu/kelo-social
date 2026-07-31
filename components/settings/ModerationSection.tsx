"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Avatar from "@/components/feed/Avatar";
import {
  getAdultContentEnabled,
  setAdultContentEnabled,
  getContentLabelPrefs,
  setContentLabelVisibility,
  getMutedWords,
  addMutedWord,
  removeMutedWord,
  CONTENT_LABELS,
  LabelVisibility,
  MutedWordEntry,
} from "@/lib/atproto/preferences";
import { listMutedAccounts, unmuteActor, listBlockedAccounts, unblockActor } from "@/lib/atproto/moderation";

export default function ModerationSection() {
  const [loading, setLoading] = useState(true);
  const [adultContent, setAdultContent] = useState(false);
  const [labelPrefs, setLabelPrefs] = useState<Record<string, LabelVisibility>>({});
  const [mutedWords, setMutedWords] = useState<MutedWordEntry[]>([]);
  const [newWord, setNewWord] = useState("");
  const [mutedAccounts, setMutedAccounts] = useState<any[]>([]);
  const [blockedAccounts, setBlockedAccounts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [adult, labels, words, mutes, blocks] = await Promise.all([
          getAdultContentEnabled(),
          getContentLabelPrefs(),
          getMutedWords(),
          listMutedAccounts(50),
          listBlockedAccounts(50),
        ]);
        setAdultContent(adult);
        setLabelPrefs(labels);
        setMutedWords(words);
        setMutedAccounts(mutes.items);
        setBlockedAccounts(blocks.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleAdult = async () => {
    const next = !adultContent;
    setAdultContent(next);
    try {
      await setAdultContentEnabled(next);
    } catch (err) {
      console.error(err);
      setAdultContent(!next);
    }
  };

  const handleLabelChange = async (label: string, visibility: LabelVisibility) => {
    setLabelPrefs((prev) => ({ ...prev, [label]: visibility }));
    try {
      await setContentLabelVisibility(label, visibility);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    try {
      await addMutedWord(newWord.trim());
      setMutedWords((prev) => [...prev, { value: newWord.trim(), targets: ["content", "tag"] }]);
      setNewWord("");
    } catch (err) {
      console.error(err);
      alert("Impossible d'ajouter ce mot.");
    }
  };

  const handleRemoveWord = async (value: string) => {
    try {
      await removeMutedWord(value);
      setMutedWords((prev) => prev.filter((w) => w.value !== value));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnmute = async (did: string) => {
    try {
      await unmuteActor(did);
      setMutedAccounts((prev) => prev.filter((a) => a.did !== did));
    } catch (err) {
      console.error(err);
      alert("Impossible de démasquer ce compte.");
    }
  };

  const handleUnblock = async (blockUri: string, did: string) => {
    try {
      await unblockActor(blockUri);
      setBlockedAccounts((prev) => prev.filter((a) => a.did !== did));
    } catch (err) {
      console.error(err);
      alert("Impossible de débloquer ce compte.");
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-kelo-muted">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Contenu sensible */}
      <section>
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Filtres de contenu</h3>

        <label className="mb-4 flex items-center justify-between rounded-2xl border border-kelo-border p-4">
          <div>
            <p className="text-sm font-bold text-kelo-text">Afficher le contenu adulte</p>
            <p className="text-xs text-kelo-muted">Désactivé par défaut.</p>
          </div>
          <input
            type="checkbox"
            checked={adultContent}
            onChange={handleToggleAdult}
            className="h-5 w-5 accent-kelo-primary"
          />
        </label>

        <div className="flex flex-col gap-3">
          {CONTENT_LABELS.map((label) => (
            <div key={label.key} className="flex items-center justify-between gap-4 rounded-2xl border border-kelo-border p-4">
              <span className="text-sm font-semibold text-kelo-text">{label.title}</span>
              <Select
                value={labelPrefs[label.key] || "warn"}
                onChange={(e) => handleLabelChange(label.key, e.target.value as LabelVisibility)}
                className="w-40"
              >
                <option value="show">Afficher</option>
                <option value="warn">Avertir</option>
                <option value="hide">Masquer</option>
              </Select>
            </div>
          ))}
        </div>
      </section>

      {/* Mots-clés masqués */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Mots-clés et expressions masqués</h3>
        <div className="mb-3 flex gap-2">
          <div className="flex-grow">
            <Input
              placeholder="Ajouter un mot ou une expression..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            />
          </div>
          <Button variant="secondary" className="w-auto px-6" onClick={handleAddWord}>
            Ajouter
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {mutedWords.map((word) => (
            <span
              key={word.value}
              className="flex items-center gap-2 rounded-full bg-kelo-background px-3 py-1.5 text-sm text-kelo-text"
            >
              {word.value}
              <button onClick={() => handleRemoveWord(word.value)} className="text-kelo-muted hover:text-kelo-danger">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {mutedWords.length === 0 && <p className="text-sm text-kelo-muted">Aucun mot masqué.</p>}
        </div>
      </section>

      {/* Comptes masqués */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Comptes masqués</h3>
        <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
          {mutedAccounts.length > 0 ? (
            mutedAccounts.map((actor) => (
              <div key={actor.did} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={actor.avatar} fallback={actor.handle[0].toUpperCase()} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-kelo-text">{actor.displayName || actor.handle}</p>
                    <p className="text-xs text-kelo-muted">@{actor.handle}</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-auto px-4 py-1.5 text-xs" onClick={() => handleUnmute(actor.did)}>
                  Démasquer
                </Button>
              </div>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-kelo-muted">Aucun compte masqué.</p>
          )}
        </div>
      </section>

      {/* Comptes bloqués */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Comptes bloqués</h3>
        <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
          {blockedAccounts.length > 0 ? (
            blockedAccounts.map((actor) => (
              <div key={actor.did} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={actor.avatar} fallback={actor.handle[0].toUpperCase()} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-kelo-text">{actor.displayName || actor.handle}</p>
                    <p className="text-xs text-kelo-muted">@{actor.handle}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-auto px-4 py-1.5 text-xs"
                  onClick={() => handleUnblock(actor.viewer?.blocking, actor.did)}
                >
                  Débloquer
                </Button>
              </div>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-kelo-muted">Aucun compte bloqué.</p>
          )}
        </div>
      </section>
    </div>
  );
}
