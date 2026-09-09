import React, { createContext, useContext, useState, useEffect } from 'react';
import { store } from '../services/store';

export interface CompanyProfile {
  companyName: string;
  legalName: string;
  tagline: string;
  websiteUrl: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  hrEmail: string;
  supportEmail: string;
  phone: string;
  address: string;
  signatoryName: string;
  signatoryTitle: string;
  termsSummary: string;
}

export const COMPANY_PRESETS: Record<string, { label: string; profile: CompanyProfile }> = {
  PILE_AND_LOOP: {
    label: 'Pile & Loop (Official Brand)',
    profile: {
      companyName: 'Pile and Loop',
      legalName: 'Pile & Loop (Pvt.) Ltd.',
      tagline: 'Premium Keyboard Rugs, Desk Mats & Digital Craft',
      websiteUrl: 'https://pileandloop.com',
      logoUrl: 'https://pileandloop.com/wp-content/uploads/2026/06/cropped-cropped-Transparent-LOGO-768x512-1.png',
      faviconUrl: '/favicon.svg',
      primaryColor: '#10B981', // Emerald Green from pileandloop.com
      secondaryColor: '#1F2937', // Dark Charcoal Slate
      accentColor: '#059669',
      currencyCode: 'PKR',
      currencySymbol: 'Rs.',
      timezone: 'Asia/Karachi',
      hrEmail: 'hr@pileandloop.com',
      supportEmail: 'pileandloop@gmail.com',
      phone: '+92 42 3578 9900',
      address: 'Gulberg III, Lahore, Punjab, Pakistan',
      signatoryName: 'Director of Human Resources',
      signatoryTitle: 'Managing Partner',
      termsSummary: 'Subject to Pile & Loop high-performance code of conduct, intellectual property assignment, and internal operating policies.'
    }
  },
  NOVA_TECH: {
    label: 'Nova Dynamics (Tech & AI Studio)',
    profile: {
      companyName: 'Nova Dynamics',
      legalName: 'Nova Dynamics Inc.',
      tagline: 'High-Velocity Cloud & Autonomous Systems',
      websiteUrl: 'https://novadynamics.io',
      logoUrl: '',
      faviconUrl: '/favicon.svg',
      primaryColor: '#3B82F6',
      secondaryColor: '#0F172A',
      accentColor: '#2563EB',
      currencyCode: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
      hrEmail: 'talent@novadynamics.io',
      supportEmail: 'ops@novadynamics.io',
      phone: '+1 (415) 890-2341',
      address: '500 Howard St, San Francisco, CA 94105',
      signatoryName: 'Head of People Operations',
      signatoryTitle: 'Vice President',
      termsSummary: 'Governed by employment laws of California and company intellectual property and proprietary development agreements.'
    }
  },
  APEX_STUDIO: {
    label: 'Apex Studios (Digital Agency)',
    profile: {
      companyName: 'Apex Creative Studios',
      legalName: 'Apex Creative Studios LLP',
      tagline: 'Digital Commerce, Branding & Visual Craft',
      websiteUrl: 'https://apexstudios.co.uk',
      logoUrl: '',
      faviconUrl: '/favicon.svg',
      primaryColor: '#8B5CF6',
      secondaryColor: '#18181B',
      accentColor: '#7C3AED',
      currencyCode: 'GBP',
      currencySymbol: '£',
      timezone: 'Europe/London',
      hrEmail: 'careers@apexstudios.co.uk',
      supportEmail: 'hello@apexstudios.co.uk',
      phone: '+44 20 7946 0192',
      address: '14 Soho Square, London W1D 3QG, UK',
      signatoryName: 'Managing Director',
      signatoryTitle: 'Head of Operations',
      termsSummary: 'Subject to UK standard employment contract terms and commercial confidentiality standards.'
    }
  }
};

const DEFAULT_PROFILE = COMPANY_PRESETS.PILE_AND_LOOP.profile;

interface CompanyContextType {
  company: CompanyProfile;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => void;
  applyPreset: (presetKey: string) => void;
  formatCurrency: (amount: number) => string;
  resetToDefaults: () => void;
}

const CompanyContext = createContext<CompanyContextType>({
  company: DEFAULT_PROFILE,
  updateCompanyProfile: () => {},
  applyPreset: () => {},
  formatCurrency: (amount: number) => `Rs. ${amount.toLocaleString()}`,
  resetToDefaults: () => {},
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanyProfile>(() => {
    try {
      const stored = localStorage.getItem('hros_company_profile');
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
      const dbSettings = store.getCollection('settings')?.companyProfile;
      if (dbSettings) {
        return { ...DEFAULT_PROFILE, ...dbSettings };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROFILE;
  });

  // Dynamic Browser Tab Title & Dynamic Favicon
  useEffect(() => {
    if (company.companyName) {
      document.title = `${company.companyName} | HR Management System`;
    }

    const faviconLink = document.getElementById('app-favicon') as HTMLLinkElement;
    if (faviconLink && company.faviconUrl) {
      faviconLink.href = company.faviconUrl;
    }
  }, [company]);

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    const updated = { ...company, ...updates };
    setCompany(updated);
    try {
      localStorage.setItem('hros_company_profile', JSON.stringify(updated));
      store.setDocument('settings', 'companyProfile', updated);
    } catch (e) {
      console.warn('Failed to save company profile:', e);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = COMPANY_PRESETS[presetKey];
    if (preset) {
      updateCompanyProfile(preset.profile);
    }
  };

  const resetToDefaults = () => {
    updateCompanyProfile(DEFAULT_PROFILE);
  };

  const formatCurrency = (amount: number): string => {
    return `${company.currencySymbol} ${Number(amount || 0).toLocaleString()} ${company.currencyCode}`;
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        updateCompanyProfile,
        applyPreset,
        formatCurrency,
        resetToDefaults
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyProfile = () => useContext(CompanyContext);
