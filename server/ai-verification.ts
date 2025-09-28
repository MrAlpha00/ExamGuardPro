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
    // Step 1: Extract information from ID card
    const idAnalysisResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert document verification system. Analyze the provided ID document image and extract key information. Return a JSON response with the following structure:
          {
            "documentType": "string (e.g., driver_license, passport, national_id)",
            "name": "full name as shown on document",
            "dateOfBirth": "date if visible",
            "idNumber": "ID/license number if visible",
            "isValidDocument": boolean,
            "confidence": number (0-1),
            "issues": ["array of any concerns or red flags"]
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this ID document and extract all visible information. Check for signs of tampering, authenticity, and overall document quality."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${idCardImage}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const idAnalysis = JSON.parse(idAnalysisResponse.choices[0].message.content || '{}');

    // Step 2: Compare faces between ID and selfie
    const faceComparisonResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a facial recognition expert. Compare the person in these two images and determine if they are the same person. Consider facial features, bone structure, eye shape, nose, mouth, and overall facial geometry. Return a JSON response:
          {
            "samePlayer": boolean,
            "confidence": number (0-1),
            "analysis": "detailed explanation of comparison",
            "concerns": ["array of any concerns or discrepancies"]
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare the faces in these two images. The first is from an official ID document, the second is a live selfie. Are they the same person?"
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
      response_format: { type: "json_object" }
    });

    const faceComparison = JSON.parse(faceComparisonResponse.choices[0].message.content || '{}');

    // Step 3: Validate against expected data
    const reasons: string[] = [];
    let isValid = true;
    let overallConfidence = 0;

    // Check document validity
    if (!idAnalysis.isValidDocument || (idAnalysis.confidence || 0) < 0.7) {
      isValid = false;
      reasons.push("ID document appears invalid or of poor quality");
    }

    // Check name match (allow for slight variations)
    if (idAnalysis.name && expectedName) {
      const nameSimilarity = calculateNameSimilarity(idAnalysis.name.toLowerCase(), expectedName.toLowerCase());
      if (nameSimilarity < 0.8) {
        isValid = false;
        reasons.push(`Name mismatch: Expected "${expectedName}", found "${idAnalysis.name}"`);
      }
    }

    // Check ID number if provided
    if (expectedIdNumber && idAnalysis.idNumber) {
      if (idAnalysis.idNumber !== expectedIdNumber) {
        isValid = false;
        reasons.push("ID number does not match expected value");
      }
    }

    // Check face match
    if (!faceComparison.samePlayer || (faceComparison.confidence || 0) < 0.7) {
      isValid = false;
      reasons.push("Face in selfie does not match ID document photo");
    }

    // Calculate overall confidence
    const docConfidence = idAnalysis.confidence || 0;
    const faceConfidence = faceComparison.confidence || 0;
    overallConfidence = (docConfidence + faceConfidence) / 2;

    if (isValid && reasons.length === 0) {
      reasons.push("All verification checks passed successfully");
    }

    return {
      isValid,
      confidence: overallConfidence,
      extractedData: {
        name: idAnalysis.name,
        dateOfBirth: idAnalysis.dateOfBirth,
        idNumber: idAnalysis.idNumber,
        documentType: idAnalysis.documentType
      },
      faceMatch: {
        matches: faceComparison.samePlayer || false,
        confidence: faceConfidence
      },
      reasons
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