/**
 * ValtariOS — Shared Navigation Registry
 *
 * Central navigation contract for the ValtariOS platform.
 * Routes are grouped into:
 *   - platform: control-center surfaces
 *   - services: individual product surfaces
 *
 * Future services can be registered here without modifying consumers.
 */

import type { PlatformService } from './platform-events';

export type NavSection = 'platform' | 'service';

export interface PlatformNavEntry {
  id: string;
  label: string;
  section: NavSection;
  service?: PlatformService;
  path: string;
  available: boolean;
  description?: string;
}

export const PLATFORM_NAV: PlatformNavEntry[] = [
  {
    id: 'platform',
    label: 'Platform',
    section: 'platform',
    path: '/platform',
    available: true,
    description: 'ValtariOS Control Center',
  },
  {
    id: 'operations',
    label: 'Operations',
    section: 'platform',
    path: '/operations',
    available: true,
    description: 'Cross-system decision operations',
  },
  {
    id: 'glue',
    label: 'Glue',
    section: 'service',
    service: 'glue',
    path: '/platform#glue',
    available: false,
    description: 'Universal Integration Fabric',
  },
  {
    id: 'core',
    label: 'Core',
    section: 'service',
    service: 'core',
    path: '/platform#core',
    available: false,
    description: 'Inference & Decision Engine',
  },
  {
    id: 'weaver',
    label: 'Weaver',
    section: 'service',
    service: 'weaver',
    path: '/dashboard',
    available: true,
    description: 'Decision Operations Platform',
  },
  {
    id: 'guardian',
    label: 'Guardian',
    section: 'service',
    service: 'guardian',
    path: '/platform#guardian',
    available: false,
    description: 'Risk Intelligence System',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    section: 'service',
    service: 'cloud',
    path: '/platform#cloud',
    available: false,
    description: 'Deployment Operations Platform',
  },
  {
    id: 'claim-clarity',
    label: 'Claim Clarity',
    section: 'service',
    service: 'claim-clarity',
    path: '/platform#claim-clarity',
    available: false,
    description: 'Healthcare Adjudication Solution',
  },
];

export function getPlatformEntries(): PlatformNavEntry[] {
  return PLATFORM_NAV.filter((e) => e.section === 'platform');
}

export function getServiceEntries(): PlatformNavEntry[] {
  return PLATFORM_NAV.filter((e) => e.section === 'service');
}
