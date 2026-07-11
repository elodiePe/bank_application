import { motion } from 'framer-motion';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ value, onChange, length = 4, disabled = false }: PinPadProps) {
  function handleKey(key: string) {
    if (disabled) return;
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key !== '' && value.length < length) {
      onChange(value + key);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3" aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{ scale: i < value.length ? 1 : 0.8 }}
            className={`h-4 w-4 rounded-full border-2 border-brand-500 ${
              i < value.length ? 'bg-brand-500' : 'bg-transparent'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={disabled}
              onClick={() => handleKey(key)}
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              {key}
            </motion.button>
          ),
        )}
      </div>
    </div>
  );
}
