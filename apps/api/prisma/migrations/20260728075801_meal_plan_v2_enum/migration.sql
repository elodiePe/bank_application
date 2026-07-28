-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MEAL_PLAN_TURN';

-- CreateEnum
CREATE TYPE "MealPlanDayMode" AS ENUM ('FIXED', 'ROTATING');
