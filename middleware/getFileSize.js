const multer = require('multer');
const multerS3 = require('multer-s3');
const wasabi = require('../lib/wasabi');
const custom_error = require('../errors/custom_errors')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')


/**
 * Parses a Wasabi URL into its component parts: region, bucket, and file key.
 * @param {string} fullUrl - The raw Wasabi link
 * @returns { {region: string, bucket: string, key: string} }
 */
const parseWasabiUrl = (fullUrl) => {
  const parsed = new URL(fullUrl);
  

  const hostParts = parsed.hostname.split('.');
  const region = hostParts[1]; 


  const pathParts = parsed.pathname.split('/').filter(Boolean);
  
  const bucket = pathParts[0];
  

  const key = decodeURIComponent(pathParts.slice(1).join('/'));

  return { region, bucket, key };
}
/* 
Output:
{
  region: 'us-east-2',
  bucket: 'faculty-science-data',
  key: 'materials/1791219590913-Abanoub Tamer.docx'
}
*/





const getFileSize = async (fileKey) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.WASABI_BUCKET_NAME,
      Key: fileKey,
    });

    // The SDK signs this request automatically using your credentials
    const response = await wasabi.send(command);
    
    const sizeInBytes = response.ContentLength;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    // console.log(`Success! File metadata found.`);
    // console.log(`File: ${fileKey}`);
    // console.log(`Size: ${sizeInBytes} bytes (~${sizeInMB} MB)`);
    
    return sizeInMB;
  } catch (error) {
    // Common errors include 404 (File not found) or 403 (Invalid credentials/permissions)
    // console.error("Error retrieving file size:", error.message);
    throw new custom_error(error.message, 404);
  }
}

module.exports = { getFileSize, parseWasabiUrl }

// Example Usage:
// getPrivateFileSize("my-private-bucket", "documents/report.pdf");
