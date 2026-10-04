export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startTrustDiscoveryWorker } = await import("./lib/atproto/trust-discovery-worker");
    startTrustDiscoveryWorker();
  }
}
