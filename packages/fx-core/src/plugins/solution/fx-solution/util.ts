// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginConfig,
  SolutionContext,
  PluginContext,
  Context,
  ConfigMap,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

/**
 * A helper function to construct a plugin's context.
 * @param solutionCtx solution context
 * @param pluginIdentifier plugin name
 */
export function getPluginContext(
  solutionCtx: SolutionContext,
  pluginIdentifier: string,
  manifest?: TeamsAppManifest
): PluginContext {
  const baseCtx: Context = solutionCtx;
  if (!solutionCtx.config.has(pluginIdentifier)) {
    solutionCtx.config.set(pluginIdentifier, new ConfigMap());
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const pluginConfig: PluginConfig = solutionCtx.config.get(pluginIdentifier)!;
  const pluginCtx: PluginContext = {
    ...baseCtx,
    configOfOtherPlugins: solutionCtx.config,
    config: pluginConfig,
    app: manifest ? manifest : new TeamsAppManifest(),
  };
  return pluginCtx;
}

/**
 * A curry-ed version of getPluginContext
 * @param solutionCtx solution context
 */
export function getPluginContextConstructor(
  solutionCtx: SolutionContext
): (pluginIdentifier: string) => PluginContext {
  return function (pluginIdentifier: string): PluginContext {
    return getPluginContext(solutionCtx, pluginIdentifier);
  };
}

export async function getSubsriptionDisplayName(
  azureToken: TokenCredentialsBase,
  subscriptionId: string
): Promise<string | undefined> {
  const client = new SubscriptionClient(azureToken);
  const subscription = await client.subscriptions.get(subscriptionId);
  return subscription.displayName;
}
