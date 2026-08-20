async function run() {
  try {
    console.log("Fetching index of live site...");
    const res = await fetch("https://code-time-keeper.vercel.app/auth");
    const html = await res.text();
    
    // Find all script tags
    const scriptRegex = /src="(\/assets\/[^"]+\.js)"/g;
    let match;
    const scripts: string[] = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1]) scripts.push(match[1]);
    }
    
    console.log("Scripts found on live site:", scripts);
    
    for (const src of scripts) {
      const scriptUrl = `https://code-time-keeper.vercel.app${src}`;
      console.log("Fetching script:", scriptUrl);
      const scriptRes = await fetch(scriptUrl);
      const code = await scriptRes.text();
      
      const supMatch = code.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
      if (supMatch) {
        console.log("SUCCESS! Found Supabase URL in live script:", supMatch[0]);
      }
    }
  } catch (e) {
    console.error("Failed to fetch live config:", e);
  }
}

run();
