import { createRemoteJWKSet, jwtVerify } from 'jose';
import { apiError, requestId } from './lib/http';
import type { AuthData, Env } from './lib/types';

export const onRequest: PagesFunction<Env, string, AuthData> = async (context) => {
  const id = requestId(context.request);
  const { env } = context;
  const bypass = env.ENVIRONMENT === 'development' && env.DEV_AUTH_BYPASS === 'true';

  if (bypass) {
    context.data.ownerEmail = 'local-development';
    return context.next();
  }

  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.OWNER_EMAIL) {
    return apiError(
      'ACCESS_NOT_CONFIGURED',
      'Dostęp do aplikacji nie jest skonfigurowany.',
      id,
      403,
    );
  }
  const token = context.request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token)
    return apiError('AUTH_REQUIRED', 'Wymagane jest logowanie przez Cloudflare Access.', id, 403);

  try {
    const teamDomain = env.CF_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const issuer = `https://${teamDomain}`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, {
      audience: env.CF_ACCESS_AUD,
      issuer,
      algorithms: ['RS256'],
    });
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (email.toLocaleLowerCase('en-US') !== env.OWNER_EMAIL.toLocaleLowerCase('en-US')) {
      return apiError('OWNER_ONLY', 'To konto nie ma dostępu do portfela.', id, 403);
    }
    context.data.ownerEmail = email;
    return context.next();
  } catch {
    return apiError('INVALID_ACCESS_TOKEN', 'Sesja Cloudflare Access jest nieprawidłowa.', id, 403);
  }
};
