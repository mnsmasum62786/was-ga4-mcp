/**
 * GA4 Admin API tools — accounts, properties, data streams, conversions,
 * custom dimensions/metrics, audiences, links.
 */

import { ga4Get, ga4Post, ga4Patch, ga4Delete } from '../google-client.js';

export const adminTools = [
  {
    name: 'ga4_list_account_summaries',
    description: 'List all GA4 account summaries the authenticated user can access. Each includes property summaries — fastest way to discover all properties.',
    inputSchema: { type: 'object', properties: { pageSize: { type: 'integer', default: 200 } } },
    handler: async ({ pageSize = 200 }) => ga4Get('/v1beta/accountSummaries', { pageSize }),
  },
  {
    name: 'ga4_list_accounts',
    description: 'List GA4 accounts.',
    inputSchema: { type: 'object', properties: { pageSize: { type: 'integer', default: 50 } } },
    handler: async ({ pageSize = 50 }) => ga4Get('/v1beta/accounts', { pageSize }),
  },
  {
    name: 'ga4_get_account',
    description: 'Get a single GA4 account by name. name format: accounts/{accountId}',
    inputSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] },
    handler: async ({ accountId }) => ga4Get(`/v1beta/accounts/${accountId}`),
  },
  {
    name: 'ga4_list_properties',
    description: 'List GA4 properties under an account. accountId must be the numeric ID (without "accounts/" prefix).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Numeric account ID (e.g. 111368097)' },
        pageSize: { type: 'integer', default: 100 },
        showDeleted: { type: 'boolean', default: false },
      },
      required: ['accountId'],
    },
    handler: async ({ accountId, pageSize = 100, showDeleted = false }) => ga4Get(`/v1beta/properties`, {
      filter: `parent:accounts/${accountId}`,
      pageSize,
      showDeleted,
    }),
  },
  {
    name: 'ga4_get_property',
    description: 'Get a single property\'s settings.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}`),
  },
  {
    name: 'ga4_update_property',
    description: 'Update GA4 property fields. updateMask is comma-separated list of fields to update (e.g. "displayName,timeZone,currencyCode,industryCategory").',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        updateMask: { type: 'string' },
        payload: { type: 'object', description: 'Fields to update — displayName, timeZone, currencyCode, industryCategory' },
      },
      required: ['propertyId', 'updateMask', 'payload'],
    },
    handler: async ({ propertyId, updateMask, payload }) => ga4Patch(`/v1beta/properties/${propertyId}?updateMask=${encodeURIComponent(updateMask)}`, payload),
  },
  {
    name: 'ga4_list_data_streams',
    description: 'List data streams in a GA4 property (web, app, etc.).',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/dataStreams`),
  },
  {
    name: 'ga4_get_data_stream',
    description: 'Get a data stream by ID, including the measurement ID and stream-specific settings.',
    inputSchema: {
      type: 'object',
      properties: { propertyId: { type: 'string' }, streamId: { type: 'string' } },
      required: ['propertyId', 'streamId'],
    },
    handler: async ({ propertyId, streamId }) => ga4Get(`/v1beta/properties/${propertyId}/dataStreams/${streamId}`),
  },
  {
    name: 'ga4_list_conversion_events',
    description: 'List configured conversion events on a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/keyEvents`),
  },
  {
    name: 'ga4_create_conversion_event',
    description: 'Mark an event as a key event (conversion). eventName is the event name to mark (e.g. "purchase", "generate_lead", "form_submit"). countingMethod: ONCE_PER_EVENT or ONCE_PER_SESSION.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        eventName: { type: 'string' },
        countingMethod: { type: 'string', enum: ['ONCE_PER_EVENT', 'ONCE_PER_SESSION'], default: 'ONCE_PER_EVENT' },
        defaultValue: { type: 'object', description: '{ numericValue: 0, currencyCode: "USD" }' },
      },
      required: ['propertyId', 'eventName'],
    },
    handler: async ({ propertyId, eventName, countingMethod, defaultValue }) => {
      const body = { eventName, countingMethod: countingMethod || 'ONCE_PER_EVENT' };
      if (defaultValue) body.defaultValue = defaultValue;
      return ga4Post(`/v1beta/properties/${propertyId}/keyEvents`, body);
    },
  },
  {
    name: 'ga4_list_custom_dimensions',
    description: 'List custom dimensions on a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/customDimensions`),
  },
  {
    name: 'ga4_create_custom_dimension',
    description: 'Create a custom dimension. scope: EVENT | USER | ITEM. parameterName is the event/user parameter to bind.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        displayName: { type: 'string' },
        parameterName: { type: 'string' },
        scope: { type: 'string', enum: ['EVENT', 'USER', 'ITEM'], default: 'EVENT' },
        description: { type: 'string' },
        disallowAdsPersonalization: { type: 'boolean', default: false },
      },
      required: ['propertyId', 'displayName', 'parameterName'],
    },
    handler: async (args) => ga4Post(`/v1beta/properties/${args.propertyId}/customDimensions`, {
      displayName: args.displayName,
      parameterName: args.parameterName,
      scope: args.scope || 'EVENT',
      description: args.description,
      disallowAdsPersonalization: args.disallowAdsPersonalization,
    }),
  },
  {
    name: 'ga4_list_custom_metrics',
    description: 'List custom metrics on a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/customMetrics`),
  },
  {
    name: 'ga4_create_custom_metric',
    description: 'Create a custom metric. measurementUnit: STANDARD | CURRENCY | FEET | METERS | KILOMETERS | MILES | MILLISECONDS | SECONDS | MINUTES | HOURS.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        displayName: { type: 'string' },
        parameterName: { type: 'string' },
        scope: { type: 'string', enum: ['EVENT'], default: 'EVENT' },
        measurementUnit: { type: 'string', default: 'STANDARD' },
        description: { type: 'string' },
        restrictedMetricType: { type: 'array', items: { type: 'string' } },
      },
      required: ['propertyId', 'displayName', 'parameterName', 'measurementUnit'],
    },
    handler: async (args) => ga4Post(`/v1beta/properties/${args.propertyId}/customMetrics`, {
      displayName: args.displayName,
      parameterName: args.parameterName,
      scope: args.scope || 'EVENT',
      measurementUnit: args.measurementUnit,
      description: args.description,
      restrictedMetricType: args.restrictedMetricType,
    }),
  },
  {
    name: 'ga4_list_audiences',
    description: 'List audiences on a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' }, pageSize: { type: 'integer', default: 50 } }, required: ['propertyId'] },
    handler: async ({ propertyId, pageSize = 50 }) => ga4Get(`/v1beta/properties/${propertyId}/audiences`, { pageSize }),
  },
  {
    name: 'ga4_list_google_ads_links',
    description: 'List Google Ads accounts linked to this property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/googleAdsLinks`),
  },
  {
    name: 'ga4_list_bigquery_links',
    description: 'List BigQuery export links on a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/bigQueryLinks`),
  },
  {
    name: 'ga4_create_bigquery_link',
    description: 'Create a BigQuery export link. project must be a GCP project ID. dataLocation: US | EU | asia-south1 | etc. dailyExportEnabled = true for daily exports, streamingExportEnabled = true for streaming.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string' },
        project: { type: 'string', description: 'GCP project ID (NOT number)' },
        dataLocation: { type: 'string', default: 'US' },
        dailyExportEnabled: { type: 'boolean', default: true },
        streamingExportEnabled: { type: 'boolean', default: false },
        includeAdvertisingId: { type: 'boolean', default: true },
        excludedEvents: { type: 'array', items: { type: 'string' } },
      },
      required: ['propertyId', 'project'],
    },
    handler: async (args) => ga4Post(`/v1beta/properties/${args.propertyId}/bigQueryLinks`, {
      project: `projects/${args.project}`,
      dailyExportEnabled: args.dailyExportEnabled !== false,
      streamingExportEnabled: args.streamingExportEnabled === true,
      includeAdvertisingId: args.includeAdvertisingId !== false,
      excludedEvents: args.excludedEvents || [],
      dataLocation: args.dataLocation || 'US',
    }),
  },
  {
    name: 'ga4_list_users',
    description: 'List access bindings (users) on an account or property. parent format: accounts/{id} or properties/{id}.',
    inputSchema: { type: 'object', properties: { parent: { type: 'string' } }, required: ['parent'] },
    handler: async ({ parent }) => ga4Get(`/v1beta/${parent}/accessBindings`),
  },
  {
    name: 'ga4_get_attribution_settings',
    description: 'Get the attribution model settings for a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/attributionSettings`),
  },
  {
    name: 'ga4_get_data_retention_settings',
    description: 'Get the data retention period for a property.',
    inputSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    handler: async ({ propertyId }) => ga4Get(`/v1beta/properties/${propertyId}/dataRetentionSettings`),
  },
];
