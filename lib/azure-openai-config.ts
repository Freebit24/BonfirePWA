/**
 * Azure OpenAI Configuration Module
 *
 * This module is STRICTLY SERVER-SIDE ONLY.
 * It must never be imported or referenced in client-side code.
 * Environment variables are validated at runtime to ensure they're never
 * bundled into client-side JavaScript.
 */

export interface AzureOpenAIConfig {
  endpoint: string;
  key: string;
  deploymentId: string;
}

/**
 * Get Azure OpenAI configuration from environment variables.
 * Throws an error if any required configuration is missing.
 * This function should only be called on the server.
 */
export function getAzureOpenAIConfig(): AzureOpenAIConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT environment variable is not set');
  }

  if (!key) {
    throw new Error('AZURE_OPENAI_KEY environment variable is not set');
  }

  if (!deploymentId) {
    throw new Error('AZURE_OPENAI_DEPLOYMENT_ID environment variable is not set');
  }

  // Validate endpoint is a valid URL
  try {
    new URL(endpoint);
  } catch {
    throw new Error('AZURE_OPENAI_ENDPOINT is not a valid URL');
  }

  return {
    endpoint,
    key,
    deploymentId,
  };
}
