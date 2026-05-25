/**
 * GA4 helpers — universal escape hatch + cross-cutting convenience.
 */

import { ga4Get, ga4Post, ga4Raw } from '../google-client.js';

export const helperTools = [
  {
    name: 'ga4_universal_call',
    description: 'UNIVERSAL — call any GA4 Data or Admin API endpoint. Use when no specialized tool exists. fullUrl must be the complete https URL (e.g. https://analyticsadmin.googleapis.com/v1beta/...).',
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PATCH', 'DELETE'], default: 'GET' },
        fullUrl: { type: 'string' },
        body: { description: 'JSON body for POST/PATCH' },
      },
      required: ['fullUrl'],
    },
    handler: async ({ method = 'GET', fullUrl, body }) => ga4Raw(method, fullUrl, body),
  },
  {
    name: 'ga4_quick_overview',
    description: 'Cross-property snapshot: count of accessible accounts + properties + recent activity. Great as a starting point.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const summaries = await ga4Get('/v1beta/accountSummaries', { pageSize: 200 });
      const accounts = summaries.accountSummaries || [];
      let totalProps = 0;
      for (const a of accounts) totalProps += (a.propertySummaries?.length || 0);
      return {
        accountCount: accounts.length,
        propertyCount: totalProps,
        accounts: accounts.slice(0, 10).map(a => ({
          accountId: a.account?.replace('accounts/', ''),
          displayName: a.displayName,
          propertyCount: a.propertySummaries?.length || 0,
          sampleProperties: (a.propertySummaries || []).slice(0, 3).map(p => ({
            propertyId: p.property?.replace('properties/', ''),
            displayName: p.displayName,
          })),
        })),
      };
    },
  },
  {
    name: 'ga4_find_property',
    description: 'Search across all your account summaries for properties matching a name substring (case-insensitive).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        exact: { type: 'boolean', default: false },
      },
      required: ['name'],
    },
    handler: async ({ name, exact }) => {
      const summaries = await ga4Get('/v1beta/accountSummaries', { pageSize: 500 });
      const accounts = summaries.accountSummaries || [];
      const needle = String(name).toLowerCase();
      const hits = [];
      for (const a of accounts) {
        for (const p of (a.propertySummaries || [])) {
          const pname = String(p.displayName || '').toLowerCase();
          const match = exact ? pname === needle : pname.includes(needle);
          if (match) {
            hits.push({
              accountId: a.account?.replace('accounts/', ''),
              accountName: a.displayName,
              propertyId: p.property?.replace('properties/', ''),
              propertyName: p.displayName,
              propertyType: p.propertyType,
            });
          }
        }
      }
      return { count: hits.length, matches: hits };
    },
  },
  {
    name: 'ga4_property_health_check',
    description: 'Quick health report for a property: yesterday vs 7-day-ago totals, conversion event count, data stream count, last data received hint.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => {
      const [report7d, conversions, streams] = await Promise.all([
        ga4Post(`/v1beta/properties/${propertyId}:runReport`, {
          dateRanges: [
            { name: 'yesterday', startDate: 'yesterday', endDate: 'yesterday' },
            { name: '7daysAgo', startDate: '7daysAgo', endDate: '7daysAgo' },
          ],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'eventCount' }, { name: 'conversions' }],
        }).catch(e => ({ error: e.message })),
        ga4Get(`/v1beta/properties/${propertyId}/keyEvents`).catch(e => ({ error: e.message })),
        ga4Get(`/v1beta/properties/${propertyId}/dataStreams`).catch(e => ({ error: e.message })),
      ]);
      return {
        yesterdayVs7dAgo: report7d,
        conversionEventsConfigured: conversions.keyEvents?.length || 0,
        conversionEvents: conversions.keyEvents?.map(c => c.eventName) || [],
        dataStreamCount: streams.dataStreams?.length || 0,
        dataStreams: streams.dataStreams?.map(s => ({
          id: s.name?.split('/').pop(),
          displayName: s.displayName,
          type: s.type,
          measurementId: s.webStreamData?.measurementId,
        })) || [],
      };
    },
  },
];
