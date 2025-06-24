// Infinite loop detector
class InfiniteLoopDetector {
  private renderCounts: Map<string, { count: number; firstTime: number; lastTime: number }> = new Map();
  private readonly threshold = 50; // More than 50 renders in 1 second is suspicious
  private readonly timeWindow = 1000; // 1 second
  
  track(componentName: string): void {
    const now = Date.now();
    const existing = this.renderCounts.get(componentName);
    
    if (!existing) {
      this.renderCounts.set(componentName, { count: 1, firstTime: now, lastTime: now });
      return;
    }
    
    // Reset if it's been more than the time window
    if (now - existing.firstTime > this.timeWindow) {
      this.renderCounts.set(componentName, { count: 1, firstTime: now, lastTime: now });
      return;
    }
    
    // Increment count
    existing.count++;
    existing.lastTime = now;
    
    // Check for infinite loop
    if (existing.count > this.threshold) {
      console.error(`[INFINITE-LOOP-DETECTED] Component "${componentName}" rendered ${existing.count} times in ${now - existing.firstTime}ms`);
      console.error('[INFINITE-LOOP-DETECTED] Stack trace:', new Error().stack);
      
      // Log all component render counts
      console.error('[INFINITE-LOOP-DETECTED] All component render counts:');
      this.renderCounts.forEach((data, name) => {
        console.error(`  ${name}: ${data.count} renders in ${data.lastTime - data.firstTime}ms`);
      });
      
      throw new Error(`Infinite loop detected in ${componentName}: ${existing.count} renders in ${now - existing.firstTime}ms`);
    }
  }
  
  reset(): void {
    this.renderCounts.clear();
  }
}

export const loopDetector = new InfiniteLoopDetector();