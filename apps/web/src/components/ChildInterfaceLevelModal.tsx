import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHILD_INTERFACE_LEVELS,
  CHILD_INTERFACE_LEVEL_LABELS,
  setChildInterfaceLevelSchema,
  type ChildInterfaceLevel,
  type SetChildInterfaceLevelInput,
} from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { Select } from './Select.js';
import { useSetChildInterfaceLevel } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

interface ChildInterfaceLevelModalProps {
  memberId: string;
  memberFirstName: string;
  currentLevel: ChildInterfaceLevel;
  onClose: () => void;
}

export function ChildInterfaceLevelModal({
  memberId,
  memberFirstName,
  currentLevel,
  onClose,
}: ChildInterfaceLevelModalProps) {
  const setLevel = useSetChildInterfaceLevel();
  const { control, handleSubmit } = useForm<SetChildInterfaceLevelInput>({
    resolver: zodResolver(setChildInterfaceLevelSchema),
    defaultValues: { interfaceLevel: currentLevel },
  });

  function onSubmit(values: SetChildInterfaceLevelInput) {
    setLevel.mutate({ memberId, input: values }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={`Interface — ${memberFirstName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="interfaceLevel">
          Quelle interface convient le mieux à {memberFirstName} ?
        </label>
        <Controller
          name="interfaceLevel"
          control={control}
          render={({ field }) => (
            <Select
              id="interfaceLevel"
              value={field.value}
              onChange={field.onChange}
              options={CHILD_INTERFACE_LEVELS.map((level) => ({
                value: level,
                label: CHILD_INTERFACE_LEVEL_LABELS[level],
              }))}
            />
          )}
        />
        {setLevel.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {setLevel.error instanceof ApiError ? setLevel.error.code : 'Une erreur est survenue.'}
          </p>
        )}
        <button
          type="submit"
          disabled={setLevel.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {setLevel.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}
