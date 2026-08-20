const apiKey = "re_DvUbqQ2Z_PGzgqboSWNupCdCYNQznxuPT";
const html = \`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background-color: #f4f4f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; }
  .header { background-color: #0a0a0a; padding: 30px; text-align: center; }
  .content { padding: 40px; color: #3f3f46; line-height: 1.6; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white; margin: 0;">STANCE</h1>
    </div>
    <div class="content">
      <h2>Invitation</h2>
      <p>This is a test with a simpler layout to fix the cropping issue.</p>
    </div>
  </div>
</body>
</html>
\`;

fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
  body: JSON.stringify({
    from: "ai-hiring@stance.health",
    to: "thechris241103@gmail.com",
    subject: "Fixed Layout Test",
    html: html
  })
}).then(r => r.json()).then(console.log);
