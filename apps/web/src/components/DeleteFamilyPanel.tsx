import { useState } from 'react';
import { Modal } from './Modal.js';
import { useCurrentFamily, useRequestAccountDeletion } from '../hooks/useFamilyAuth.js';

export function DeleteFamilyPanel() {
  const [open, setOpen] = useState(false);
  const { data: family } = useCurrentFamily();
  const requestDeletion = useRequestAccountDeletion();

  return (
    <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-900 dark:bg-slate-900">
      <h3 className="font-medium text-red-700 dark:text-red-400">Zone de danger</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Supprime définitivement le compte famille et toutes ses données (membres, comptes, historique).
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Supprimer le compte famille
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Supprimer le compte famille">
          {requestDeletion.isSuccess ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Un e-mail de confirmation a été envoyé à <strong>{family?.ownerEmail}</strong>. Ouvre-le et
              clique sur le lien pour finaliser la suppression — rien n'est encore supprimé.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                <strong>Cette action est irréversible.</strong> Tous les membres, comptes enfants,
                transactions, demandes et notifications de cette famille seront définitivement
                supprimés.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Nous t'enverrons un e-mail de confirmation à <strong>{family?.ownerEmail}</strong>. La
                suppression n'aura lieu qu'après avoir cliqué sur le lien et ressaisi ton mot de passe.
              </p>
              {requestDeletion.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue.</p>
              )}
              <button
                type="button"
                onClick={() => requestDeletion.mutate()}
                disabled={requestDeletion.isPending}
                className="mt-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {requestDeletion.isPending ? 'Envoi…' : 'Recevoir le lien de confirmation'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
