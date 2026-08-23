$path1 = "c:\Users\DELL\Desktop\QLDACNTT\reset_and_seed.ps1"
$path2 = "c:\Users\DELL\Desktop\QLDACNTT\server.ps1"

$utf8NoBom = [System.Text.Encoding]::UTF8
$utf8Bom = New-Object System.Text.UTF8Encoding($true)

$text1 = [System.IO.File]::ReadAllText($path1, $utf8NoBom)
[System.IO.File]::WriteAllText($path1, $text1, $utf8Bom)

$text2 = [System.IO.File]::ReadAllText($path2, $utf8NoBom)
[System.IO.File]::WriteAllText($path2, $text2, $utf8Bom)

Write-Host "Converted reset_and_seed.ps1 and server.ps1 to UTF-8 with BOM!" -ForegroundColor Green
