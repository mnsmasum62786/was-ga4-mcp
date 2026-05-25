/**
 * GA4 Data API tools — reports, real-time, pivots, metadata.
 */

import { ga4Post, ga4Get } from '../google-client.js';

export const dataTools = [
  {
    name: 'ga4_run_report',
    description: `UNIVERSAL REPORT — run any GA4 report. propertyId is the numeric property ID.

dateRanges: array of { startDate, endDate }. Date format YYYY-MM-DD or relative like "today", "yesterday", "7daysAgo", "30daysAgo".

dimensions: array of { name } — examples: date, country, sessionDefaultChannelGroup, sessionSource, sessionMedium, deviceCategory, browser, pagePath, pageTitle, eventName, customEvent:my_param, audienceName, firstUserDefaultChannelGroup, etc.

metrics: array of { name } — examples: activeUsers, sessions, screenPageViews, eventCount, conversions, totalRevenue, engagedSessions, engagementRate, averageSessionDuration, bounceRate, transactions, purchaseRevenue, addToCarts, beginCheckouts.

dimensionFilter / metricFilter: filter expressions. Example: { "filter": { "fieldName": "sessionDefaultChannelGroup", "stringFilter": { "value": "Organic Search" } } }.

orderBys: [{ "dimension": { "dimensionName": "date" } }] or [{ "metric": { "metricName": "sessions" }, "desc": true }].

limit: max rows (default 1000, max 250000).`,
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        dateRanges: { type: 'array', items: { type: 'object' }, default: [{ startDate: '7daysAgo', endDate: 'yesterday' }] },
        dimensions: { type: 'array', items: { type: 'object' } },
        metrics: { type: 'array', items: { type: 'object' } },
        dimensionFilter: { type: 'object' },
        metricFilter: { type: 'object' },
        orderBys: { type: 'array', items: { type: 'object' } },
        limit: { type: 'integer', default: 1000 },
        offset: { type: 'integer', default: 0 },
        keepEmptyRows: { type: 'boolean', default: false },
        currencyCode: { type: 'string' },
      },
      required: ['propertyId', 'metrics'],
    },
    handler: async (args) => {
      const body = {
        dateRanges: args.dateRanges || [{ startDate: '7daysAgo', endDate: 'yesterday' }],
        dimensions: args.dimensions || [],
        metrics: args.metrics,
        limit: args.limit || 1000,
        offset: args.offset || 0,
        keepEmptyRows: args.keepEmptyRows || false,
      };
      if (args.dimensionFilter) body.dimensionFilter = args.dimensionFilter;
      if (args.metricFilter) body.metricFilter = args.metricFilter;
      if (args.orderBys) body.orderBys = args.orderBys;
      if (args.currencyCode) body.currencyCode = args.currencyCode;
      return ga4Post(`/v1beta/properties/${args.propertyId}:runReport`, body);
    },
  },
  {
    name: 'ga4_run_realtime_report',
    description: 'Real-time report (last 30 min of activity). Common metrics: activeUsers, screenPageViews, eventCount. Common dimensions: country, city, deviceCategory, browser, unifiedScreenName, eventName.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        dimensions: { type: 'array', items: { type: 'object' } },
        metrics: { type: 'array', items: { type: 'object' } },
        dimensionFilter: { type: 'object' },
        metricFilter: { type: 'object' },
        limit: { type: 'integer', default: 100 },
        minuteRanges: { type: 'array', items: { type: 'object' }, description: '[{name, startMinutesAgo, endMinutesAgo}] — defaults to last 30 min' },
      },
      required: ['propertyId', 'metrics'],
    },
    handler: async (args) => {
      const body = {
        dimensions: args.dimensions || [],
        metrics: args.metrics,
        limit: args.limit || 100,
      };
      if (args.dimensionFilter) body.dimensionFilter = args.dimensionFilter;
      if (args.metricFilter) body.metricFilter = args.metricFilter;
      if (args.minuteRanges) body.minuteRanges = args.minuteRanges;
      return ga4Post(`/v1beta/properties/${args.propertyId}:runRealtimeReport`, body);
    },
  },
  {
    name: 'ga4_run_pivot_report',
    description: 'Pivoted report (cross-tabulation). Useful for heatmap-style breakdowns. pivots: [{ fieldNames: ["country"], limit: 10, orderBys: [...], offset: 0 }].',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        dateRanges: { type: 'array', items: { type: 'object' }, default: [{ startDate: '30daysAgo', endDate: 'yesterday' }] },
        dimensions: { type: 'array', items: { type: 'object' } },
        metrics: { type: 'array', items: { type: 'object' } },
        pivots: { type: 'array', items: { type: 'object' } },
        dimensionFilter: { type: 'object' },
      },
      required: ['propertyId', 'metrics', 'pivots'],
    },
    handler: async (args) => ga4Post(`/v1beta/properties/${args.propertyId}:runPivotReport`, {
      dateRanges: args.dateRanges || [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: args.dimensions || [],
      metrics: args.metrics,
      pivots: args.pivots,
      ...(args.dimensionFilter ? { dimensionFilter: args.dimensionFilter } : {}),
    }),
  },
  {
    name: 'ga4_batch_run_reports',
    description: 'Run up to 5 reports in a single API call. Reduces round trips for dashboards. requests: array of report bodies (same shape as ga4_run_report).',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        requests: { type: 'array', items: { type: 'object' }, minItems: 1, maxItems: 5 },
      },
      required: ['propertyId', 'requests'],
    },
    handler: async ({ propertyId, requests }) => ga4Post(`/v1beta/properties/${propertyId}:batchRunReports`, { requests }),
  },
  {
    name: 'ga4_get_metadata',
    description: 'List all dimensions + metrics available for a property (including custom ones). Use to discover what you can query.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/metadata`),
  },
  {
    name: 'ga4_check_compatibility',
    description: 'Check whether requested dimensions + metrics are compatible (can be combined in one report).',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        dimensions: { type: 'array', items: { type: 'object' } },
        metrics: { type: 'array', items: { type: 'object' } },
      },
      required: ['propertyId'],
    },
    handler: async ({ propertyId, dimensions, metrics }) => ga4Post(`/v1beta/properties/${propertyId}:checkCompatibility`, {
      dimensions: dimensions || [],
      metrics: metrics || [],
    }),
  },
];
