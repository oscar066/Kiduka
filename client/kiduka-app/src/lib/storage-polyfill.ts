// This file polyfills localStorage on the server to prevent "localStorage is not defined" or "localStorage.getItem is not a function" errors
// which can happen with some libraries in Next.js SSR.

if (typeof window === 'undefined') {
  const noop = () => {};
  const storageMock = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    length: 0,
    key: (_index: number) => null,
  };

  try {
    // Check if localStorage is missing or broken
    const globalAny = global as any;
    
    if (typeof globalAny.localStorage === 'undefined' || typeof globalAny.localStorage.getItem !== 'function') {
      console.log('Polyfilling localStorage on server');
      
      // Try to simply assign first
      try {
        globalAny.localStorage = storageMock;
      } catch (err) {
        // If assignment fails (e.g. read-only), try defineProperty
        Object.defineProperty(global, 'localStorage', {
          value: storageMock,
          writable: true,
          configurable: true
        });
      }
    }
  } catch (e) {
    console.error('Error polyfilling localStorage:', e);
  }
}
