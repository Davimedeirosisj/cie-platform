import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

// The media query *is* an external store, so subscribing to it directly is both
// what useSyncExternalStore is for and how this avoids the cascading render the
// original effect+setState version caused on every mount.
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // no viewport on the server; the old version also rendered desktop first
  )
}
