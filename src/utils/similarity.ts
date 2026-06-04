/**
 * Compute similarity score (0 to 100) between two item descriptors.
 */
export function computeSimilarity(descriptorA: any, descriptorB: any): number {
  if (!descriptorA || !descriptorB) return 0;
  let score = 0;
  const maxScore = 100;

  // Category match (30 pts)
  if (descriptorA.category && descriptorB.category && descriptorA.category === descriptorB.category) {
    score += 30;
  }

  // Primary color match (20 pts)
  if (
    descriptorA.primaryColor &&
    descriptorB.primaryColor &&
    descriptorA.primaryColor.toLowerCase().trim() === descriptorB.primaryColor.toLowerCase().trim()
  ) {
    score += 20;
  }

  // Brand match (20 pts)
  if (
    descriptorA.brand &&
    descriptorB.brand &&
    descriptorA.brand.toLowerCase().trim() === descriptorB.brand.toLowerCase().trim()
  ) {
    score += 20;
  }

  // Material match (10 pts)
  if (descriptorA.material && descriptorB.material && descriptorA.material === descriptorB.material) {
    score += 10;
  }

  // Size match (10 pts)
  if (descriptorA.size && descriptorB.size && descriptorA.size === descriptorB.size) {
    score += 10;
  }

  // Distinctive features overlap (10 pts)
  const featuresA = new Set<string>(
    (descriptorA.distinctiveFeatures || []).map((f: string) => f.toLowerCase().trim())
  );
  const featuresB = new Set<string>(
    (descriptorB.distinctiveFeatures || []).map((f: string) => f.toLowerCase().trim())
  );
  
  if (featuresA.size > 0) {
    const intersection = [...featuresA].filter(f => featuresB.has(f));
    score += (intersection.length / featuresA.size) * 10;
  }

  return Math.round((score / maxScore) * 100);
}
