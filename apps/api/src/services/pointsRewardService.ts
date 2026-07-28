import type { PrismaClient } from '@prisma/client';
import type { PointsRewardSummary } from '@banque-familiale/shared';
import { createPointsRewardRepository } from '../repositories/pointsRewardRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

type RewardRow = { id: string; childUserId: string; title: string; pointsRequired: number };

export function createPointsRewardService(prisma: PrismaClient) {
  const repo = createPointsRewardRepository(prisma);
  const userRepo = createUserRepository(prisma);

  async function memberLookup(familyId: string) {
    const members = await userRepo.listFamilyMembers(familyId);
    return new Map(members.map((m) => [m.id, m.firstName]));
  }

  function toSummary(reward: RewardRow, members: Map<string, string>): PointsRewardSummary {
    return {
      id: reward.id,
      childUserId: reward.childUserId,
      childFirstName: members.get(reward.childUserId) ?? '?',
      title: reward.title,
      pointsRequired: reward.pointsRequired,
    };
  }

  return {
    async list(familyId: string): Promise<PointsRewardSummary[]> {
      const [rewards, members] = await Promise.all([repo.listForFamily(familyId), memberLookup(familyId)]);
      return rewards.map((r) => toSummary(r, members));
    },

    async create(params: {
      familyId: string;
      childUserId: string;
      title: string;
      pointsRequired: number;
    }): Promise<PointsRewardSummary> {
      const members = await memberLookup(params.familyId);
      if (!members.has(params.childUserId)) throw new ValidationError('Enfant invalide');

      const reward = await repo.create({
        familyId: params.familyId,
        childUserId: params.childUserId,
        title: params.title,
        pointsRequired: params.pointsRequired,
      });
      return toSummary(reward, members);
    },

    async delete(params: { familyId: string; rewardId: string }): Promise<void> {
      const reward = await repo.findByIdOrThrow(params.rewardId);
      if (reward.familyId !== params.familyId) throw new NotFoundError('Récompense introuvable');
      await repo.delete(params.rewardId);
    },
  };
}

export type PointsRewardService = ReturnType<typeof createPointsRewardService>;
