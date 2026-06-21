import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

interface AttestifyCert {
	cert_id: string;
	recipient_name: string;
	recipient_email?: string;
	course: string;
	issuer: string;
	verify_url: string;
	cert_url: string;
	json_url: string;
}

interface AttestifyIssueResponse {
	ok: boolean;
	error?: string;
	detail?: string;
	certs?: AttestifyCert[];
}

export class Attestify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Attestify',
		name: 'attestify',
		icon: 'file:attestify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ "Issue certificate" }}',
		description:
			'Issue verifiable certificates — each certificate gets a permanent, cryptographically-signed public verify page anyone can check',
		defaults: {
			name: 'Attestify',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Issue Certificate',
						value: 'issue',
						description: 'Issue a verifiable certificate for one recipient',
						action: 'Issue a verifiable certificate',
					},
				],
				default: 'issue',
			},
			{
				displayName: 'Organization / Issuer',
				name: 'issuer',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Acme Real Estate Academy',
				description:
					'The organization issuing the certificate (shown on the certificate and the public verify page)',
			},
			{
				displayName: 'Course / Credential',
				name: 'course',
				type: 'string',
				default: '',
				required: true,
				placeholder: '4-Hour Continuing Education — Ethics',
				description: 'The course or credential being certified',
			},
			{
				displayName: 'Recipient Name',
				name: 'recipientName',
				type: 'string',
				default: '={{ $json.name }}',
				required: true,
				description: 'Name of the certificate recipient',
			},
			{
				displayName: 'Recipient Email',
				name: 'recipientEmail',
				type: 'string',
				default: '={{ $json.email }}',
				description:
					'Optional. Echoed back so you can join it to the verify URL for your mail-merge or LMS. It is never stored in the signed record and never shown on the public verify page (recipient PII stays on your side).',
			},
			{
				displayName: 'Completion Date',
				name: 'completionDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD (defaults to today)',
				description:
					'Optional. The date the credential was earned, shown on the certificate (format YYYY-MM-DD). Leave empty to stamp today. Useful when issuing for a course completed earlier.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'API Base URL',
						name: 'baseUrl',
						type: 'string',
						default: 'https://attestify.novadyne.ai',
						description: 'Base URL of the Attestify service. Change only for self-hosting or testing.',
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
				const issuer = (this.getNodeParameter('issuer', i) as string).trim();
				const course = (this.getNodeParameter('course', i) as string).trim();
				const recipientName = (this.getNodeParameter('recipientName', i) as string).trim();
				const recipientEmail = ((this.getNodeParameter('recipientEmail', i, '') as string) || '').trim();
				const completionDate = ((this.getNodeParameter('completionDate', i, '') as string) || '').trim();
				const options = this.getNodeParameter('options', i, {}) as { baseUrl?: string };
				const baseUrl = (options.baseUrl || 'https://attestify.novadyne.ai').replace(/\/+$/, '');

				if (!recipientName) {
					throw new NodeOperationError(this.getNode(), 'Recipient Name is required', {
						itemIndex: i,
					});
				}

				if (completionDate && !/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
					throw new NodeOperationError(
						this.getNode(),
						`Completion Date must be in YYYY-MM-DD format (got "${completionDate}")`,
						{ itemIndex: i },
					);
				}

				const recipient: { name: string; email?: string } = { name: recipientName };
				if (recipientEmail) recipient.email = recipientEmail;

				const requestBody: {
					issuer: string;
					course: string;
					recipients: Array<{ name: string; email?: string }>;
					date?: string;
				} = { issuer, course, recipients: [recipient] };
				if (completionDate) requestBody.date = completionDate;

				const response = (await this.helpers.httpRequest({
					method: 'POST',
					url: `${baseUrl}/cert/issue`,
					headers: { 'User-Agent': 'n8n-nodes-attestify/0.1.0' },
					body: requestBody,
					json: true,
				})) as AttestifyIssueResponse;

				if (!response || response.ok !== true) {
					const err = response?.error ?? 'unknown';
					const detail = response?.detail ? ` — ${response.detail}` : '';
					throw new NodeOperationError(this.getNode(), `Attestify error: ${err}${detail}`, {
						itemIndex: i,
					});
				}

				const cert = response.certs && response.certs[0];
				if (!cert) {
					throw new NodeOperationError(
						this.getNode(),
						'Attestify returned no certificate (the recipient may have been filtered as empty, or the request was treated as an automated crawler)',
						{ itemIndex: i },
					);
				}

				returnData.push({
					json: {
						cert_id: cert.cert_id,
						recipient_name: cert.recipient_name,
						recipient_email: cert.recipient_email ?? (recipientEmail || undefined),
						course: cert.course,
						issuer: cert.issuer,
						completion_date: completionDate || undefined,
						verify_url: cert.verify_url,
						cert_image_url: cert.cert_url,
						signed_record_url: cert.json_url,
					},
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
