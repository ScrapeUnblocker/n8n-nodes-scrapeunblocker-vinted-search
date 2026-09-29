import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Vinted Search Scraper" Actor: https://apify.com/scrapeunblocker/vinted-search-scraper
const ACTOR_ID = 'krJi2rV45e8e8rDd3';
const INTEGRATION_APP_ID = 'scrapeunblocker-vinted-search-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	domain: {
		key: 'domain',
	},
	order: {
		key: 'order',
	},
	priceFrom: {
		key: 'price_from',
	},
	priceTo: {
		key: 'price_to',
	},
	page: {
		key: 'page',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'listing:search': {
			input.query = requireString.call(this, 'query', 'Search Query', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class VintedSearchScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vinted Search Scraper',
		name: 'vintedSearchScraper',
		icon: {
			light: 'file:vintedSearchScraper.png',
			dark: 'file:vintedSearchScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search Vinted listings on eight marketplaces with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Vinted Search Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Listing',
						value: 'listing',
					},
				],
				default: 'listing',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['listing'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search Vinted listings by keyword',
						action: 'Search listings',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'nike air max',
				description: "What to search for, e.g. 'nike air max' or 'levis 501'",
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 96,
				description: 'How many listings to collect across pages (about 96 per page, up to 500)',
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Marketplace',
						name: 'domain',
						type: 'options',
						options: [
							{
								name: 'France (vinted.fr)',
								value: 'fr',
							},
							{
								name: 'Germany (vinted.de)',
								value: 'de',
							},
							{
								name: 'Italy (vinted.it)',
								value: 'it',
							},
							{
								name: 'Netherlands (vinted.nl)',
								value: 'nl',
							},
							{
								name: 'Poland (vinted.pl)',
								value: 'pl',
							},
							{
								name: 'Spain (vinted.es)',
								value: 'es',
							},
							{
								name: 'United Kingdom (vinted.co.uk)',
								value: 'co.uk',
							},
							{
								name: 'United States (vinted.com)',
								value: 'com',
							},
						],
						default: 'co.uk',
						description:
							'Which Vinted marketplace to search. Prices and currency follow the marketplace.',
					},
					{
						displayName: 'Max Price',
						name: 'priceTo',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 50,
						description: "Highest price to include, in the marketplace's currency",
					},
					{
						displayName: 'Min Price',
						name: 'priceFrom',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: "Lowest price to include, in the marketplace's currency",
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'DE',
						description: 'Exit-IP country as an ISO-2 code (e.g. DE). Defaults to an EU exit.',
					},
					{
						displayName: 'Sort By',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'Newest First',
								value: 'newest_first',
							},
							{
								name: 'Price: high to low',
								value: 'price_high_to_low',
							},
							{
								name: 'Price: low to high',
								value: 'price_low_to_high',
							},
							{
								name: 'Relevance',
								value: 'relevance',
							},
						],
						default: 'relevance',
						description: 'Result ordering',
					},
					{
						displayName: 'Start Page',
						name: 'page',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 1,
						description: 'Results page to start from (1 is the first page)',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
