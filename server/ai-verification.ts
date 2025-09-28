import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IDVerificationResult {
  isValid: boolean;
  confidence: number;
  extractedData: {
    name?: string;
    dateOfBirth?: string;
    idNumber?: string;
    documentType?: string;
  };
  faceMatch: {
    matches: boolean;
    confidence: number;
  };
  reasons: string[];
}

export async function verifyIDDocument(
  idCardImage: string, // base64 image
  selfieImage: string,  // base64 image
  expectedName: string,
  expectedIdNumber?: string
): Promise<IDVerificationResult> {
  try {
    // Single combined API call for faster verification
    const verificationResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a fast ID verification system. Analyze both images simultaneously:
1. Extract name from the ID document
2. Check if the person in both images is the same
3. Validate document authenticity

Return this JSON structure:
{
  "name": "extracted name from ID",
  "documentType": "type of document",
  "isValidDocument": boolean,
  "faceMatch": boolean,
  "overallConfidence": number (0-1),
  "passed": boolean,
  "reason": "brief explanation"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Quick verification needed:
1. Extract the name from the ID document
2. Check if the faces match between ID and selfie
3. Expected name should be: "${expectedName}"

Focus on speed and accuracy. Return pass/fail decision.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${idCardImage}`
              }
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${selfieImage}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500 // Limit response for speed
    });

    const result = JSON.parse(verificationResponse.choices[0].message.content || '{}');

    // Fast validation logic
    const reasons: string[] = [];
    let isValid = result.passed || false;
    
    // Check name match with more lenient comparison
    if (result.name && expectedName) {
      const nameSimilarity = calculateNameSimilarity(result.name.toLowerCase(), expectedName.toLowerCase());
      if (nameSimilarity < 0.7) { // More lenient threshold
        isValid = false;
        reasons.push(`Name mismatch: Expected "${expectedName}", found "${result.name}"`);
      }
    }

    // Add AI's reason
    if (result.reason) {
      reasons.push(result.reason);
    }

    // Override if AI says it passed but we failed name check
    if (!isValid && result.passed) {
      reasons.push("Failed name verification despite face match");
    }

    return {
      isValid,
      confidence: result.overallConfidence || 0.8,
      extractedData: {
        name: result.name,
        documentType: result.documentType,
        idNumber: expectedIdNumber,
        dateOfBirth: undefined
      },
      faceMatch: {
        matches: result.faceMatch || false,
        confidence: result.overallConfidence || 0.8
      },
      reasons: reasons.length > 0 ? reasons : ["Verification completed"]
    };

  } catch (error) {
    console.error("ID verification error:", error);
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      faceMatch: { matches: false, confidence: 0 },
      reasons: [`Verification failed: ${error.message}`]
    };
  }
}

// Simple name similarity calculation using Levenshtein distance
function calculateNameSimilarity(name1: string, name2: string): number {
  const longer = name1.length > name2.length ? name1 : name2;
  const shorter = name1.length > name2.length ? name2 : name1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator   // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}