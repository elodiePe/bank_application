/** Flat, brand-colored illustrations for the landing page — drawn from primitives (no external
 * image assets, so no licensing/hosting concerns and nothing extra to fetch offline in the PWA). */

interface IllustrationProps {
  className?: string;
}

/** A parent and child smiling at a phone together — the "family with the app in hand" hero visual. */
export function FamilyWithAppIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 360 320" className={className} aria-hidden>
      <circle cx="180" cy="168" r="150" className="fill-brand-100 dark:fill-brand-900/30" />

      {/* sparkles */}
      <g className="fill-amber-400 dark:fill-amber-300">
        <path d="M62 74l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <path d="M296 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M300 210l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      </g>

      {/* parent */}
      <g>
        <ellipse cx="132" cy="286" rx="46" ry="10" className="fill-brand-900/10 dark:fill-black/30" />
        <path
          d="M92 286v-58c0-28 18-46 40-46s40 18 40 46v58z"
          className="fill-brand-500 dark:fill-brand-600"
        />
        <circle cx="132" cy="150" r="30" className="fill-amber-200 dark:fill-amber-300" />
        <path
          d="M104 144c0-18 13-32 28-32s28 14 28 32c-8-6-18-9-28-9s-20 3-28 9z"
          className="fill-amber-700 dark:fill-amber-800"
        />
      </g>

      {/* child */}
      <g>
        <ellipse cx="230" cy="292" rx="36" ry="8" className="fill-brand-900/10 dark:fill-black/30" />
        <path
          d="M200 292v-44c0-22 14-36 32-36s32 14 32 36v44z"
          className="fill-amber-400 dark:fill-amber-500"
        />
        <circle cx="232" cy="188" r="24" className="fill-amber-200 dark:fill-amber-300" />
        <path
          d="M210 184c0-14 10-25 22-25s22 11 22 25c-6-5-14-7-22-7s-16 2-22 7z"
          className="fill-amber-700 dark:fill-amber-800"
        />
        {/* big smile */}
        <path
          d="M222 194q10 8 20 0"
          stroke="currentColor"
          className="text-amber-800 dark:text-amber-900"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* phone held between them */}
      <g>
        <rect x="150" y="150" width="64" height="112" rx="14" className="fill-white dark:fill-slate-800 stroke-brand-600 dark:stroke-brand-400" strokeWidth="3" />
        <rect x="160" y="164" width="44" height="10" rx="5" className="fill-brand-500" />
        <rect x="160" y="182" width="30" height="8" rx="4" className="fill-amber-400" />
        <rect x="160" y="196" width="44" height="8" rx="4" className="fill-emerald-400" />
        <rect x="160" y="210" width="36" height="8" rx="4" className="fill-brand-300" />
        <circle cx="182" cy="234" r="9" className="fill-brand-600" />
        <path d="M178 234l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* parent arm reaching to phone */}
      <path
        d="M160 210q-6 14 2 28"
        stroke="currentColor"
        className="text-brand-500 dark:text-brand-600"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* child arm reaching to phone */}
      <path
        d="M204 234q8 8 4 20"
        stroke="currentColor"
        className="text-amber-400 dark:text-amber-500"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** A grinning child stacking and tossing coins — for the money/argent-de-poche context. */
export function ChildCountingCoinsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 280" className={className} aria-hidden>
      <ellipse cx="160" cy="252" rx="120" ry="14" className="fill-brand-900/10 dark:fill-black/30" />
      <circle cx="160" cy="140" r="128" className="fill-amber-50 dark:fill-amber-900/20" />

      {/* seated child */}
      <path
        d="M96 246c-4-38 8-70 20-84 10-12 26-18 44-18s34 6 44 18c12 14 24 46 20 84z"
        className="fill-brand-500 dark:fill-brand-600"
      />
      <circle cx="160" cy="120" r="38" className="fill-amber-200 dark:fill-amber-300" />
      <path
        d="M124 112c0-22 16-40 36-40s36 18 36 40c-10-7-23-11-36-11s-26 4-36 11z"
        className="fill-amber-700 dark:fill-amber-800"
      />
      <circle cx="148" cy="122" r="4" className="fill-amber-900" />
      <circle cx="172" cy="122" r="4" className="fill-amber-900" />
      <path
        d="M144 136q16 14 32 0"
        stroke="currentColor"
        className="text-amber-900"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* rosy cheeks */}
      <circle cx="136" cy="130" r="6" className="fill-rose-300/70" />
      <circle cx="184" cy="130" r="6" className="fill-rose-300/70" />

      {/* arms up, tossing coins */}
      <path
        d="M112 200q-24-10-30-34"
        stroke="currentColor"
        className="text-brand-500 dark:text-brand-600"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M208 200q24-10 30-34"
        stroke="currentColor"
        className="text-brand-500 dark:text-brand-600"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* coin stack in front */}
      <g>
        <ellipse cx="160" cy="242" rx="26" ry="8" className="fill-amber-500" />
        <ellipse cx="160" cy="232" rx="26" ry="8" className="fill-amber-400" />
        <ellipse cx="160" cy="222" rx="26" ry="8" className="fill-amber-500" />
        <ellipse cx="160" cy="212" rx="26" ry="8" className="fill-amber-300" />
      </g>

      {/* flying coins */}
      <g className="fill-amber-400">
        <circle cx="72" cy="150" r="12" />
        <text x="72" y="155" textAnchor="middle" fontSize="12" className="fill-amber-700" fontWeight="700">
          €
        </text>
      </g>
      <g className="fill-amber-300">
        <circle cx="252" cy="140" r="14" />
        <text x="252" y="145" textAnchor="middle" fontSize="13" className="fill-amber-700" fontWeight="700">
          €
        </text>
      </g>
      <g className="fill-amber-400">
        <circle cx="230" cy="90" r="10" />
        <text x="230" y="94" textAnchor="middle" fontSize="10" className="fill-amber-700" fontWeight="700">
          €
        </text>
      </g>
      <g className="fill-amber-300">
        <circle cx="90" cy="94" r="9" />
      </g>
    </svg>
  );
}

/** A piggy bank with a coin dropping in and a small savings bar-chart growing behind it. */
export function SavingsGrowthIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden>
      <ellipse cx="160" cy="228" rx="130" ry="14" className="fill-brand-900/10 dark:fill-black/30" />
      <circle cx="160" cy="128" r="120" className="fill-emerald-50 dark:fill-emerald-900/20" />

      {/* growth bars behind the piggy bank */}
      <g className="fill-brand-200 dark:fill-brand-800">
        <rect x="46" y="150" width="22" height="60" rx="4" />
        <rect x="78" y="120" width="22" height="90" rx="4" className="fill-brand-300 dark:fill-brand-700" />
      </g>
      <g className="fill-emerald-200 dark:fill-emerald-800">
        <rect x="220" y="130" width="22" height="80" rx="4" />
        <rect x="252" y="96" width="22" height="114" rx="4" className="fill-emerald-300 dark:fill-emerald-700" />
      </g>
      <path
        d="M50 168l30-24 30 14 40-40"
        stroke="currentColor"
        className="text-emerald-500 dark:text-emerald-400"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M136 100l14-2 2 14" stroke="currentColor" className="text-emerald-500 dark:text-emerald-400" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* piggy bank */}
      <g>
        <ellipse cx="160" cy="222" rx="10" ry="4" className="fill-rose-900/10" />
        <ellipse cx="188" cy="222" rx="10" ry="4" className="fill-rose-900/10" />
        <rect x="152" y="204" width="14" height="18" rx="5" className="fill-rose-400" />
        <rect x="180" y="204" width="14" height="18" rx="5" className="fill-rose-400" />
        <ellipse cx="172" cy="168" rx="70" ry="52" className="fill-rose-400 dark:fill-rose-500" />
        <circle cx="228" cy="150" r="18" className="fill-rose-400 dark:fill-rose-500" />
        <path d="M240 138l14-8-4 16z" className="fill-rose-400 dark:fill-rose-500" />
        <circle cx="234" cy="146" r="3.5" className="fill-rose-900" />
        <ellipse cx="112" cy="150" rx="10" ry="14" className="fill-rose-300 dark:fill-rose-400" transform="rotate(-20 112 150)" />
        <rect x="164" y="128" width="16" height="5" rx="2.5" className="fill-rose-600" />
        <path d="M120 170q20 12 44 4" stroke="currentColor" className="text-rose-500 dark:text-rose-600" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* coin dropping into the slot */}
      <g>
        <circle cx="172" cy="90" r="14" className="fill-amber-400" />
        <text x="172" y="95" textAnchor="middle" fontSize="13" className="fill-amber-700" fontWeight="700">
          €
        </text>
        <path
          d="M172 104v18"
          stroke="currentColor"
          className="text-amber-400"
          strokeWidth="2"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
