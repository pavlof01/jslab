// Type augmentation for engine262's custom SyntaxError properties.
// The engine262 parser attaches these properties to SyntaxError instances
// to carry source position and decoration (stack annotation) information.
declare global {
  interface SyntaxError {
    decoration?: string;
    position?: number;
  }
}

export {};
