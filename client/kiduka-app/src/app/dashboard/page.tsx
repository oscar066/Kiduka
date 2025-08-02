// dashboard/normal user
'use client';

import React from 'react';
import { ProtectedPage } from '../components/auth/roleBasedGaurd';
import { RoleBasedLayout } from '../components/layout/roleBasedLayout';
import { RoleBasedDashboard } from '../components/dashboard/roleBasedDashboard';

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <RoleBasedLayout>
        <RoleBasedDashboard />
      </RoleBasedLayout>
    </ProtectedPage>
  );
}