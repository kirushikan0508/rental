import { RekognitionClient, CompareFacesCommand, CompareFacesCommandInput } from '@aws-sdk/client-rekognition';
import dotenv from 'dotenv';

dotenv.config();

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Compares a selfie image with a NIC image to verify identity.
 * @param sourceImageBuffer The selfie image as a Buffer
 * @param targetImageBuffer The NIC photo as a Buffer
 * @param similarityThreshold Minimum similarity required (0-100)
 * @returns An object containing the match status and similarity score
 */
export const compareFaces = async (
  sourceImageBuffer: Buffer,
  targetImageBuffer: Buffer,
  similarityThreshold: number = 80
) => {
  try {
    const params: CompareFacesCommandInput = {
      SourceImage: { Bytes: sourceImageBuffer },
      TargetImage: { Bytes: targetImageBuffer },
      SimilarityThreshold: similarityThreshold,
    };

    const command = new CompareFacesCommand(params);
    const response = await rekognitionClient.send(command);

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const highestMatch = response.FaceMatches[0];
      return {
        isMatch: true,
        similarity: highestMatch.Similarity,
      };
    } else {
      return {
        isMatch: false,
        similarity: 0,
      };
    }
  } catch (error) {
    console.error('Rekognition error:', error);
    throw new Error('Failed to compare faces using AWS Rekognition');
  }
};
