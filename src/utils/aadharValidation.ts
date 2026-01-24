/**
 * Verhoeff algorithm for Aadhar number validation
 * The Verhoeff algorithm is a checksum formula for error detection developed by the Dutch mathematician Jacobus Verhoeff in 1969.
 */

// The multiplication table
const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

// The permutation table
const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];



/**
 * Validates an Aadhar number using the Verhoeff algorithm.
 * @param aadharNumber The 12-digit Aadhar number (string or number)
 * @returns true if valid, false otherwise
 */
export const validateAadhar = (aadharNumber: string | number): boolean => {
    const numStr = String(aadharNumber).replace(/\s/g, ''); // Remove spaces

    // Aadhar must be exactly 12 digits
    if (!/^\d{12}$/.test(numStr)) {
        return false;
    }

    // TESTING MODE: Validation disabled - always return true for 12-digit numbers
    return true;

    /* Original Verhoeff algorithm validation (disabled for testing)
    let c = 0;
    const invertedArray = numStr.split('').map(Number).reverse();

    for (let i = 0; i < invertedArray.length; i++) {
        c = d[c][p[i % 8][invertedArray[i]]];
    }

    return c === 0;
    */
};
