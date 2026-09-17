import '@testing-library/jest-dom'

// Mock matchMedia, scrollTo, and scrollIntoView for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true })
window.HTMLElement.prototype.scrollIntoView = () => {}