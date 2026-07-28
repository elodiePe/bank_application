import { useState } from 'react';
import { CHILD_INTERFACE_LEVEL_LABELS, type ChildInterfaceLevel } from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useMembers, useUpdateMemberPermissions } from '../hooks/useMembers.js';
import { AddMemberModal } from './AddMemberModal.js';
import { DeactivateMemberModal } from './DeactivateMemberModal.js';
import { ResetCredentialModal } from './ResetCredentialModal.js';
import { ChildInterfaceLevelModal } from './ChildInterfaceLevelModal.js';
import { PermissionCheckboxes } from './PermissionCheckboxes.js';
import type { PermissionValues } from '../utils/permissions.js';
import { IconButton } from './IconButton.js';
import { PowerIcon, RefreshIcon, ShieldIcon, SlidersIcon } from './icons.js';

type ResetTarget = { memberId: string; firstName: string };
type DeactivateTarget = { memberId: string; firstName: string };
type InterfaceLevelTarget = { memberId: string; firstName: string; currentLevel: ChildInterfaceLevel };

export function FamilyManagementPanel() {
  const { data: currentUser } = useCurrentUser();
  const members = useMembers();
  const updatePermissions = useUpdateMemberPermissions();
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null);
  const [permissionsOpenFor, setPermissionsOpenFor] = useState<string | null>(null);
  const [interfaceLevelTarget, setInterfaceLevelTarget] = useState<InterfaceLevelTarget | null>(null);

  const isAdmin = currentUser?.permissions?.isAdmin ?? false;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Gestion de la famille</h3>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          + Ajouter un membre
        </button>
      </div>

      {members.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>}

      <ul className="flex flex-col gap-2">
        {members.data?.map((member) => {
          const canEditPermissions =
            isAdmin && member.role === 'PARENT' && member.id !== currentUser?.id && !member.permissions?.isAdmin;
          return (
            <li
              key={member.id}
              className={`rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 ${
                member.isActive ? '' : 'opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {member.firstName}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({member.role === 'PARENT' ? 'parent' : 'enfant'}
                      {member.permissions?.isAdmin ? ' · admin' : ''})
                    </span>
                    {!member.isActive && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">
                        désactivé
                      </span>
                    )}
                  </p>
                  {member.email && <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>}
                  {member.role === 'CHILD' && member.interfaceLevel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Interface : {CHILD_INTERFACE_LEVEL_LABELS[member.interfaceLevel]}
                    </p>
                  )}
                </div>
                {member.isActive && member.id !== currentUser?.id && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {member.role === 'CHILD' && member.interfaceLevel && (
                      <IconButton
                        label="Changer le niveau d'interface"
                        variant="brand"
                        onClick={() =>
                          setInterfaceLevelTarget({
                            memberId: member.id,
                            firstName: member.firstName,
                            currentLevel: member.interfaceLevel!,
                          })
                        }
                      >
                        <SlidersIcon />
                      </IconButton>
                    )}
                    {canEditPermissions && (
                      <IconButton
                        label="Droits"
                        variant="violet"
                        onClick={() => setPermissionsOpenFor((cur) => (cur === member.id ? null : member.id))}
                      >
                        <ShieldIcon />
                      </IconButton>
                    )}
                    <IconButton
                      label="Réinitialiser le code"
                      variant="amber"
                      onClick={() => setResetTarget({ memberId: member.id, firstName: member.firstName })}
                    >
                      <RefreshIcon />
                    </IconButton>
                    <IconButton
                      label="Désactiver"
                      variant="red"
                      onClick={() => setDeactivateTarget({ memberId: member.id, firstName: member.firstName })}
                    >
                      <PowerIcon />
                    </IconButton>
                  </div>
                )}
              </div>
              {canEditPermissions && permissionsOpenFor === member.id && member.permissions && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  <PermissionCheckboxes
                    value={member.permissions}
                    disabled={updatePermissions.isPending}
                    onChange={(next: PermissionValues) =>
                      updatePermissions.mutate({ memberId: member.id, input: next })
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {addOpen && <AddMemberModal onClose={() => setAddOpen(false)} />}
      {resetTarget && (
        <ResetCredentialModal
          memberId={resetTarget.memberId}
          memberFirstName={resetTarget.firstName}
          onClose={() => setResetTarget(null)}
        />
      )}
      {deactivateTarget && (
        <DeactivateMemberModal
          memberId={deactivateTarget.memberId}
          memberFirstName={deactivateTarget.firstName}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
      {interfaceLevelTarget && (
        <ChildInterfaceLevelModal
          memberId={interfaceLevelTarget.memberId}
          memberFirstName={interfaceLevelTarget.firstName}
          currentLevel={interfaceLevelTarget.currentLevel}
          onClose={() => setInterfaceLevelTarget(null)}
        />
      )}
    </div>
  );
}
