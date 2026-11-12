import process from "node:process";

type AuthentikConfiguration = {
  clientId: string;
  clientSecret: string;
  issuer: string;
};

export const getAuthentikConfiguration = (env: {
  AUTHENTIK_CLIENT_ID?: string;
  AUTHENTIK_CLIENT_SECRET?: string;
  AUTHENTIK_ISSUER?: string;
}): AuthentikConfiguration | null => {
  const config = {
    clientId: env.AUTHENTIK_CLIENT_ID?.trim(),
    clientSecret: env.AUTHENTIK_CLIENT_SECRET?.trim(),
    issuer: env.AUTHENTIK_ISSUER?.trim().replace(/\/+$/, ""),
  };
  const configuredValues = Object.values(config).filter(Boolean).length;

  if (!configuredValues) return null;

  const missingVariables = [
    !config.clientId && "AUTHENTIK_CLIENT_ID",
    !config.clientSecret && "AUTHENTIK_CLIENT_SECRET",
    !config.issuer && "AUTHENTIK_ISSUER",
  ].filter((variable): variable is string => Boolean(variable));

  if (!config.clientId || !config.clientSecret || !config.issuer) {
    throw new Error(`Incomplete Authentik configuration. Missing: ${missingVariables.join(", ")}`);
  }

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    issuer: config.issuer,
  };
};

export const AUTHENTIK_CONFIG: AuthentikConfiguration | null = getAuthentikConfiguration({
  AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
  AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
  AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
});
export const IS_AUTHENTIK_LOGIN_ENABLED: boolean = Boolean(AUTHENTIK_CONFIG);
