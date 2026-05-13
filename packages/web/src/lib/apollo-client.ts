import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { onError } from '@apollo/client/link/error'
import { clearAuthenticated } from './auth'

// In dev, attach the client to globalThis so Fast Refresh doesn't create a
// new instance (with a fresh empty cache) on every hot reload — which would
// cause every query to start from scratch and show skeletons indefinitely.
declare const globalThis: typeof global & { __apolloClient?: ApolloClient }
let _client: ApolloClient | null = null

function buildClient() {
  // credentials: 'include' sends the httpOnly auth_token cookie on every request
  const httpLink = createHttpLink({
    uri: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:17642'}/api/graphql`,
    credentials: 'include',
  })

  const errorLink = onError(({ error }) => {
    const isUnauthenticated = CombinedGraphQLErrors.is(error)
      ? error.errors.some(
          (e) => e.extensions?.['code'] === 'UNAUTHENTICATED' || e.message === 'Unauthorized',
        )
      : error?.message?.includes('UNAUTHENTICATED') || error?.message?.includes('Unauthorized')
    if (typeof window !== 'undefined' && isUnauthenticated) {
      clearAuthenticated()
      window.location.href = '/'
    }
  })

  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
      query: { fetchPolicy: 'cache-first' },
    },
  })
}

export function getApolloClient() {
  if (process.env.NODE_ENV === 'development') {
    if (!globalThis.__apolloClient) globalThis.__apolloClient = buildClient()
    return globalThis.__apolloClient
  }
  if (!_client) _client = buildClient()
  return _client
}
