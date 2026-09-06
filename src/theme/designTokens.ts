/**
 * NEXTAURA DESIGN SYSTEM TOKENS
 * Light-First Enterprise SaaS Design Tokens
 */

export const designTokens = {
  colors: {
    // Canvas & Main Backgrounds
    canvas: {
      light: '#F8F9FA', // Warm soft porcelain off-white
      subtle: '#F1F5F9', // Slightly deeper tone for sectioning
    },
    // Primary Content Surfaces
    surface: {
      card: '#FFFFFF',
      hover: '#F8FAFC',
      active: '#F1F5F9',
      border: '#E2E8F0',
      borderSubtle: '#F1F5F9',
    },
    // Typography Colors
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#475569', // Slate 600
      muted: '#64748B', // Slate 500
      subtle: '#94A3B8', // Slate 400
      inverse: '#FFFFFF',
    },
    // Primary Action Accent (Ink Blue / Indigo)
    brand: {
      primary: '#1E40AF', // Blue 800
      primaryHover: '#1D4ED8', // Blue 700
      primaryActive: '#1E3A8A', // Blue 900
      lightBg: '#EFF6FF', // Blue 50
      lightText: '#1E40AF',
      lightBorder: '#DBEAFE',
    },
    // Category Identifiers (Subtle background fills + readable text)
    categories: {
      finance: {
        bg: '#F5F3FF', // Violet 50
        text: '#5B21B6', // Violet 800
        border: '#DDD6FE', // Violet 200
        accent: '#7C3AED',
      },
      hr: {
        bg: '#FFFBEB', // Amber 50
        text: '#92400E', // Amber 800
        border: '#FDE68A', // Amber 200
        accent: '#D97706',
      },
      marketing: {
        bg: '#FFF1F2', // Rose 50
        text: '#9F1239', // Rose 800
        border: '#FECDD3', // Rose 200
        accent: '#E11D48',
      },
      platform: {
        bg: '#ECFDF5', // Emerald 50
        text: '#065F46', // Emerald 800
        border: '#A7F3D0', // Emerald 200
        accent: '#059669',
      },
    },
    // Semantic Statuses (Quiet, desaturated)
    status: {
      draft: {
        bg: '#F8FAFC',
        text: '#475569',
        border: '#E2E8F0',
      },
      pending: {
        bg: '#FFFBEB',
        text: '#B45309',
        border: '#FDE68A',
      },
      approved: {
        bg: '#F0FDF4',
        text: '#166534',
        border: '#BBF7D0',
      },
      paid: {
        bg: '#F0FDF4',
        text: '#166534',
        border: '#BBF7D0',
      },
      overdue: {
        bg: '#FEF2F2',
        text: '#991B1B',
        border: '#FECACA',
      },
      active: {
        bg: '#EFF6FF',
        text: '#1E40AF',
        border: '#BFDBFE',
      },
      inactive: {
        bg: '#F8FAFC',
        text: '#64748B',
        border: '#E2E8F0',
      },
    },
  },
  // Radiuses
  radius: {
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.25rem', // 20px
    full: '9999px',
  },
  // Shadows (Soft, low-opacity, restrained)
  shadows: {
    card: '0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
    dropdown: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
    modal: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
  },
  // Transitions
  motion: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
