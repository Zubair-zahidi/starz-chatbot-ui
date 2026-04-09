// src/services/api/astronomical.ts
// The backend currently doesn't expose a dedicated astronomical stats endpoint.
// We keep this module as a stable API for the dashboard.

export const astronomicalApi = {
  getStats: async (): Promise<{ stars: string; exoplanets: string; galaxies: string }> => {
    return {
      stars: '2.5B',
      exoplanets: '5.5K',
      galaxies: '200B',
    };
  },
};
