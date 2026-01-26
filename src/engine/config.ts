export const NETWORK_CONFIG = {
  ORIGIN: {
    count: 1,
  },

  CDN: {
    countPerOrigin: 3,
    position: {
      y: 200,
    },
    options: {
      latencyToOrigin: 100, // ms
      bandwidthToOrigin: 10000, // Mbps
    },
  },

  FOG: {
    countPerCDN: 2,
    position: {
      y: 350,
    },
    options: {
      latencyToCDN: 20, // ms
      bandwidthToCDN: 1000, // Mbps
    },
  },

  USER: {
    countPerFog: 5,
    position: {
      y: 500,
    },
    options: {
      latencyToFog: 10, // ms
      bandwidthToFog: 100, // Mbps
    },
  },
};
