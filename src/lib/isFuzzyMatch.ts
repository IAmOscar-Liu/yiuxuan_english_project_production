const TOLERANCE = 5;

/**
 * Calculates the Levenshtein distance between two strings. This is the number of
 * edits (insertions, deletions, substitutions) required to change one string to the other.
 * This is a helper function for the main matching logic.
 * @param {string} s1 The first string.
 * @param {string} s2 The second string.
 * @returns {number} The Levenshtein distance.
 */
const levenshteinDistance = (s1: string, s2: string) => {
  // Create a matrix to store distances. The dimensions are (s2.length + 1) x (s1.length + 1).
  const matrix = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  // Initialize the first row and column of the matrix.
  // The distance of an empty string to a string of length i is i.
  for (let i = 0; i <= s1.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[j][0] = j;
  }

  // Fill in the rest of the matrix using dynamic programming.
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      // If the characters are the same, the cost is 0, otherwise it's 1.
      const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;

      // The value of matrix[j][i] is the minimum of three operations:
      // 1. Deletion: matrix[j][i - 1] + 1
      // 2. Insertion: matrix[j - 1][i] + 1
      // 3. Substitution: matrix[j - 1][i - 1] + substitutionCost
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  // The final distance is in the bottom-right cell of the matrix.
  return matrix[s2.length][s1.length];
};

/**
 * Checks if a user's input is a fuzzy match for a target phrase.
 * @param {string} userInput The string entered by the user.
 * @param {string} targetPhrase The phrase to match against.
 * @param {number} tolerance The maximum allowed Levenshtein distance. A good starting
 * point is about 25-30% of the target phrase's length.
 * @returns {boolean} True if the input is considered a match, false otherwise.
 */
export function isFuzzyMatch(
  userInput: string,
  targetPhrase: string,
  tolerance: number = TOLERANCE
) {
  // 1. Normalize both strings for a fair comparison.
  //    - Convert to lowercase.
  //    - Remove common punctuation.
  //    - Trim whitespace from the ends.
  const normalizedInput = userInput
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
  const normalizedTarget = targetPhrase
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();

  // An empty input should not match.
  if (!normalizedInput) {
    return false;
  }

  // 2. Calculate the "edit distance" between the two strings.
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);

  // 3. Compare the distance to our allowed tolerance.
  //    If the distance is less than or equal to the tolerance, it's a match!
  // console.log(
  //   `Input: "${userInput}" (Normalized: "${normalizedInput}"), Distance: ${distance}, Match: ${
  //     distance <= tolerance
  //   }`
  // );
  return distance <= tolerance;
}
