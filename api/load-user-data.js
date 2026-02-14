// api/load-user-data.js
// NEW VERSION - Uses Vercel Blob Storage (data lasts forever!)
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email } = req.query;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    
    // Create safe filename from email
    const filename = email.replace(/[^a-zA-Z0-9@.]/g, '_') + '.json';
    
    // List all blobs and find the matching file
    const { blobs } = await list();
    const userBlob = blobs.find(blob => blob.pathname === filename);
    
    if (!userBlob) {
      // No data found for this user
      return res.status(200).json({ 
        success: true,
        data: null,
        message: 'No data found for this email'
      });
    }
    
    // Fetch the data from the blob URL
    const response = await fetch(userBlob.url);
    const data = await response.json();
    
    console.log('Data loaded from Blob for:', email);
    
    return res.status(200).json({ 
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Load error:', error);
    return res.status(500).json({ 
      error: 'Failed to load data',
      details: error.message 
    });
  }
}
```

5. Scroll down and click **"Commit new file"**

---

## **✅ CHECKLIST - When You're Done:**

Your **multi-ai-backend** should have:
```
📁 multi-ai-backend/
  ├── 📄 package.json  ← UPDATED ✅
  ├── 📁 api/
  │   ├── 📄 chat.js  ← Unchanged (keep it)
  │   ├── 📄 save-user-data.js  ← NEW ✅
  │   └── 📄 load-user-data.js  ← NEW ✅
