/** NextAura's semantic light-first workspace tokens. */
export const designTokens = {
  colors: {
    canvas: { light: '#F7F7F4', subtle: '#F1F2ED' },
    surface: { card: '#FFFFFF', hover: '#F5F7F3', active: '#EDF4F0', border: '#E3E6E1', borderSubtle: '#EDF0EC' },
    text: { primary: '#202522', secondary: '#59625D', muted: '#78817C', subtle: '#98A09B', inverse: '#FFFFFF' },
    brand: { primary: '#285143', primaryHover: '#203F35', primaryActive: '#19342B', lightBg: '#EDF4F0', lightText: '#285143', lightBorder: '#C9DACF' },
    categories: {
      finance: { bg: '#F1F6F3', text: '#285143', border: '#C9DACF', accent: '#356553' },
      hr: { bg: '#FAF5E9', text: '#7A5C22', border: '#E8DAB9', accent: '#A47A2A' },
      marketing: { bg: '#F9F0F0', text: '#865252', border: '#E9D1D1', accent: '#A96868' },
      platform: { bg: '#F2F3F4', text: '#505C64', border: '#DDE1E3', accent: '#687982' },
    },
    status: {
      draft: { bg: '#F5F6F4', text: '#59625D', border: '#E3E6E1' },
      pending: { bg: '#FBF6E9', text: '#805F1D', border: '#EADBB1' },
      approved: { bg: '#EDF6F0', text: '#376348', border: '#CDE1D3' },
      paid: { bg: '#EDF6F0', text: '#376348', border: '#CDE1D3' },
      overdue: { bg: '#FAEEEE', text: '#954747', border: '#EBCBCB' },
      active: { bg: '#EDF4F0', text: '#285143', border: '#C9DACF' },
      inactive: { bg: '#F5F6F4', text: '#78817C', border: '#E3E6E1' },
    },
  },
  spacing: { pageX: 'clamp(1rem, 3vw, 2.5rem)', pageY: 'clamp(1.25rem, 3vw, 2.5rem)', section: '2rem', card: '1.5rem', field: '1rem' },
  radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem', full: '9999px' },
  shadows: {
    card: '0 1px 2px rgba(26,35,30,.02), 0 8px 22px rgba(26,35,30,.02)',
    dropdown: '0 14px 36px rgba(26,35,30,.10)',
    modal: '0 24px 64px rgba(26,35,30,.15)',
  },
  motion: { fast: '150ms ease', normal: '180ms ease', slow: '260ms ease' },
};
