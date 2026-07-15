import type { Request, Response } from 'express';
import {
  addMemberSchema,
  bootstrapParentSchema,
  changePasswordSchema,
  changePinSchema,
  confirmMemberPasswordResetSchema,
  deactivateMemberSchema,
  resetPasswordSchema,
  resetPinSchema,
  setEmailSchema,
} from '@banque-familiale/shared';
import type { MemberService } from '../services/memberService.js';
import { ValidationError } from '../utils/errors.js';

export function createMemberController(memberService: MemberService) {
  return {
    async listMembers(req: Request, res: Response) {
      const members = await memberService.listMembers(req.auth!.familyId);
      res.json(members);
    },

    async setOwnEmail(req: Request, res: Response) {
      const parsed = setEmailSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.setOwnEmail(req.auth!.sub, parsed.data.email);
      res.status(204).end();
    },

    async changeOwnPassword(req: Request, res: Response) {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.changeOwnPassword({ userId: req.auth!.sub, ...parsed.data });
      res.status(204).end();
    },

    async changeOwnPin(req: Request, res: Response) {
      const parsed = changePinSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.changeOwnPin({ userId: req.auth!.sub, ...parsed.data });
      res.status(204).end();
    },

    async bootstrapParent(req: Request, res: Response) {
      const parsed = bootstrapParentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const member = await memberService.createFirstParent({
        familyId: req.familyOwner!.familyId,
        firstName: parsed.data.firstName,
        password: parsed.data.password,
      });
      res.status(201).json(member);
    },

    async addMember(req: Request, res: Response) {
      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const member = await memberService.addFamilyMember({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        firstName: parsed.data.firstName,
        role: parsed.data.role,
        password: parsed.data.password,
        pin: parsed.data.pin,
      });
      res.status(201).json(member);
    },

    async resetPassword(req: Request, res: Response) {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.resetCredential({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        targetUserId: String(req.params.id),
        newPassword: parsed.data.newPassword,
      });
      res.status(204).end();
    },

    async resetPin(req: Request, res: Response) {
      const parsed = resetPinSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.resetCredential({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        targetUserId: String(req.params.id),
        newPin: parsed.data.newPin,
      });
      res.status(204).end();
    },

    async requestPasswordReset(req: Request, res: Response) {
      await memberService.requestPasswordReset(req.familyOwner!.familyId, String(req.params.id));
      res.status(204).end();
    },

    async confirmPasswordReset(req: Request, res: Response) {
      const parsed = confirmMemberPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.confirmPasswordReset(parsed.data);
      res.status(204).end();
    },

    async requestPinResetNotification(req: Request, res: Response) {
      await memberService.requestPinResetNotification(req.familyOwner!.familyId, String(req.params.id));
      res.status(204).end();
    },

    async deactivateMember(req: Request, res: Response) {
      const parsed = deactivateMemberSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      await memberService.deactivateMember({
        familyId: req.auth!.familyId,
        actorId: req.auth!.sub,
        targetUserId: String(req.params.id),
        confirmEmail: parsed.data.confirmEmail,
      });
      res.status(204).end();
    },
  };
}

export type MemberController = ReturnType<typeof createMemberController>;
