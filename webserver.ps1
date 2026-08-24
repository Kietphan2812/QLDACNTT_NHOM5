# ============================================================================
# HRMASTER PRO - STATIC WEB FILE SERVER FOR PORT 8080
# ============================================================================

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8088/")
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "HRMASTER PRO WEB FILE SERVER IS RUNNING ON PORT 8088" -ForegroundColor Green
Write-Host "Access in browser: http://localhost:8088/" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$root = "c:\Users\DELL\Desktop\QLDACNTT"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.AbsolutePath.TrimStart('/')
        if (-not $path) { $path = "index.html" }

        $filePath = Join-Path $root $path

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content-Type mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                default { $response.ContentType = "text/plain" }
            }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }

        $response.Close()
    } catch {
        # Catch connection resets silently
    }
}
