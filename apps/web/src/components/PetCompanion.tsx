import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePetName } from '../hooks/usePetName.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { formatMoney } from '../utils/currency.js';
import { STAGES, stageFor } from '../utils/petStages.js';
import { Modal } from './Modal.js';
import { PencilIcon } from './icons.js';

const PET_REACTIONS = [
  'Merci pour le câlin ! 💕',
  'Il est tout content de te voir !',
  'Il fait un petit bruit joyeux !',
  'Il te fait un clin d’œil.',
  'Il saute de joie !',
];

const NUDGE_REACTIONS = [
  'Il aimerait bien que tu finisses tes tâches aujourd’hui !',
  'Fais tes tâches, ça le rendra fier de toi !',
];

function RenameModal({
  open,
  onClose,
  currentName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(currentName);

  useEffect(() => {
    if (open) setValue(currentName);
  }, [open, currentName]);

  function submit() {
    onSave(value);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Donne-lui un nom !">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          autoFocus
          value={value}
          maxLength={30}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          C'est son nom !
        </button>
      </div>
    </Modal>
  );
}

/** A savings companion that grows through emoji "evolution" stages as the child's real
 * balance grows — storytelling wrapper around the same balance already shown elsewhere, so
 * saving money feels like raising a pet rather than watching a number. `hasPendingChores`
 * lets it nudge the child the same playful way, instead of a plain checklist reminder.
 * `onStageIndexChange` reports the current stage index up to the parent, both so it can drive
 * badge/celebration logic and so the stage math lives in exactly one place. */
export function PetCompanion({
  balanceCents,
  hasPendingChores,
  streakDays,
  userId,
  onStageIndexChange,
}: {
  balanceCents: number;
  hasPendingChores: boolean;
  streakDays: number;
  userId: string | undefined;
  onStageIndexChange?: (index: number) => void;
}) {
  const { currency, rate, rateLoading } = useFxRate();
  const { stage, index, next } = stageFor(balanceCents);
  const { name, setName } = usePetName(userId, stage.label);
  const [renameOpen, setRenameOpen] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [message, setMessage] = useState(stage.flavor);
  const revertTimer = useRef<ReturnType<typeof setTimeout>>();

  // Falls back to the stage's own flavor text whenever the balance moves it into a new
  // stage, unless a petting reaction is actively showing.
  useEffect(() => {
    setMessage(stage.flavor);
  }, [stage.flavor]);

  useEffect(() => {
    onStageIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function onPet() {
    setBounceKey((k) => k + 1);
    const pool = hasPendingChores && Math.random() < 0.4 ? NUDGE_REACTIONS : PET_REACTIONS;
    setMessage(pool[Math.floor(Math.random() * pool.length)]!);
    clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setMessage(stage.flavor), 2500);
  }

  useEffect(() => () => clearTimeout(revertTimer.current), []);

  const progressPercent = next
    ? Math.min(100, Math.round(((balanceCents - stage.minCents) / (next.minCents - stage.minCents)) * 100))
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex w-full flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-brand-500 to-brand-700 p-6 text-white shadow-lg"
    >
      {streakDays > 1 && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
          🔥 {streakDays} jours
        </span>
      )}
      <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
        Niveau {index + 1}/{STAGES.length}
      </span>

      <div className="mt-6 flex items-center gap-1.5">
        <p className="text-lg font-bold">{name}</p>
        <button
          type="button"
          onClick={() => setRenameOpen(true)}
          aria-label="Renommer"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:bg-white/20"
        >
          <PencilIcon />
        </button>
      </div>
      <p className="text-xs text-brand-100">{stage.label}</p>

      <motion.button
        type="button"
        onClick={onPet}
        key={bounceKey}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.25, 0.95, 1.1, 1] }}
        transition={{ duration: 0.5 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`Faire un câlin à ${name}`}
        className="mt-2 text-8xl drop-shadow-lg"
      >
        {stage.emoji}
      </motion.button>

      <div className="mt-2 min-h-10 max-w-xs text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm text-brand-50"
          >
            💬 {message}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-3 w-full max-w-xs">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
          <motion.div
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-white"
          />
        </div>
        <p className="mt-1 text-xs text-brand-100">
          {next ? `Encore un peu pour qu'il évolue en ${next.label} !` : 'Il a atteint sa forme la plus belle !'}
        </p>
      </div>

      <p className="mt-3 text-4xl font-extrabold">
        {rateLoading ? '…' : formatMoney(convertCents(balanceCents, rate), currency)}
      </p>
      <p className="text-xs text-brand-100">dans ta tirelire</p>

      <RenameModal open={renameOpen} onClose={() => setRenameOpen(false)} currentName={name} onSave={setName} />
    </motion.div>
  );
}
