/**
 * Utility functions for image processing
 */

/**
 * Extracts the plain SVG XML string from a Data URL.
 * Handles both Base64 encoded and URL-encoded SVG data URLs.
 */
export function svgDataUrlToString(dataUrl: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/svg+xml')) {
    console.error("Invalid SVG Data URL format.");
    return null;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    console.error("Invalid Data URL: Missing comma separator.");
    return null;
  }

  const header = dataUrl.substring(0, commaIndex);
  const encodedData = dataUrl.substring(commaIndex + 1);

  if (header.includes(';base64')) {
    try {
      // Decode Base64
      return atob(encodedData);
    } catch (e) {
      console.error("Error decoding Base64 SVG data:", e);
      return null;
    }
  } else {
    try {
      // Decode URL-encoded string
      return decodeURIComponent(encodedData);
    } catch (e) {
      console.error("Error decoding URL-encoded SVG data:", e);
      return null;
    }
  }
}

/**
 * Fetches an image URL and converts it to a data URL
 */
export async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Ensure SVG has the required xmlns attribute.
 * Many SVG files (especially from vector editors) omit this, but resvg requires it.
 */
export function ensureSvgNamespace(svgString: string): string {
  // Check if xmlns is already present
  if (svgString.includes('xmlns=')) {
    return svgString;
  }
  
  // Add xmlns to the opening <svg> tag
  return svgString.replace(
    /<svg\s/i,
    '<svg xmlns="http://www.w3.org/2000/svg" '
  );
}
