export type FeatureFlags = {
  stocksEnabled: boolean;
  mealPlanEnabled: boolean;
  shoppingListEnabled: boolean;
  laundryEnabled: boolean;
};

export const FEATURE_TOGGLES: { key: keyof FeatureFlags; icon: string; label: string; description: string }[] = [
  { key: 'stocksEnabled', icon: '📈', label: 'Actions', description: 'Portefeuille boursier pour les enfants.' },
  { key: 'mealPlanEnabled', icon: '🍽️', label: 'Repas', description: 'Planning des repas et rotation des cuisiniers.' },
  { key: 'shoppingListEnabled', icon: '🛒', label: 'Liste de courses', description: 'Liste de courses collaborative.' },
  { key: 'laundryEnabled', icon: '🧺', label: 'Ménage', description: 'Types de linge et rotation des tâches ménagères.' },
];
