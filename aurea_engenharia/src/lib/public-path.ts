// The HTML sets the base before loading this module. Keep links and images
// under the same mount regardless of the local server's document root.
export const publicBasePath = new URL('.', document.baseURI).pathname
