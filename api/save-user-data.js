// api/save-user-data.js
// NEW VERSION - Uses Vercel Blob Storage (data lasts forever!)
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, data } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    
    // Create safe filename from email
    const filename = email.replace(/[^a-zA-Z0-9@.]/g, '_') + '.json';
    
    // Save data to Vercel Blob
    const blob = await put(filename, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false, // Keep consistent filename
    });
    
    console.log('Data saved to Blob:', blob.url);
    
    return res.status(200).json({ 
      success: true,
      message: 'Data saved successfully to cloud',
      url: blob.url
    });
    
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({ 
      error: 'Failed to save data',
      details: error.message 
    });
  }
}
