'use client';

import React from 'react';
import { BudgetPacing } from '@/lib/types';
import { useFrame } from '@/components/layout/FrameContext';
import { ModernBudgetPacing } from './ModernBudgetPacing';

/** The budget card wired to the shared budget settings, so Home and Budget behave the same. */
export function BudgetPacingPanel({ pacing }: { pacing: BudgetPacing }) {
  const { updateConfig, openLog } = useFrame();
  return (
    <ModernBudgetPacing
      pacing={pacing}
      onUpdateGeneralBudget={(v) => updateConfig({ generalBudget: v })}
      onUpdateElectricityBudget={(v) => updateConfig({ electricityBudget: v })}
      onUpdateBudgetRecurringDay={(v) => updateConfig({ budgetRecurringDay: v })}
      onUpdateRentRecurringDay={(v) => updateConfig({ rentRecurringDay: v })}
      onUpdateRentAmount={(v) => updateConfig({ rentAmount: v })}
      onUpdateElectricityRemaining={(v) => updateConfig({ electricityRemaining: v })}
      onOpenQuickLog={openLog}
    />
  );
}
